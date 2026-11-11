"""Advanced Image Loader (Tallron)

Drop-in style replacement for ComfyUI's Load Image node with:
  - an extra IMAGE output resized to a target megapixel count
  - interactive crop (JS modal → hidden crop JSON applied here)
"""

import hashlib
import json
import os

import numpy as np
import torch
from PIL import Image, ImageOps, ImageSequence

import comfy.model_management
import comfy.utils
import folder_paths
import node_helpers


def _parse_crop(crop_str):
    """
    Parse crop JSON from the frontend.
    Expected: {"x":0..1, "y":0..1, "w":0..1, "h":0..1}  (normalized)
    Empty / invalid / full-frame → None (no crop).
    """
    if not crop_str or not str(crop_str).strip():
        return None
    try:
        data = json.loads(crop_str)
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    try:
        x = float(data.get("x", 0))
        y = float(data.get("y", 0))
        w = float(data.get("w", 1))
        h = float(data.get("h", 1))
    except (TypeError, ValueError):
        return None
    # Clamp
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.0, min(1.0 - x, w))
    h = max(0.0, min(1.0 - y, h))
    # Treat near-full-frame as no crop
    if w < 0.001 or h < 0.001:
        return None
    if abs(x) < 1e-4 and abs(y) < 1e-4 and abs(w - 1.0) < 1e-4 and abs(h - 1.0) < 1e-4:
        return None
    return (x, y, w, h)


def _apply_crop_tensor(image, crop, is_mask=False):
    """
    Crop a BHWC image or BHW mask tensor using normalized (x, y, w, h).
    """
    if crop is None or image is None:
        return image
    x, y, w, h = crop
    if is_mask:
        # MASK is BHW (or HW)
        if image.ndim == 2:
            H, W = image.shape
            x0 = max(0, min(W - 1, int(round(x * W))))
            y0 = max(0, min(H - 1, int(round(y * H))))
            x1 = max(x0 + 1, min(W, int(round((x + w) * W))))
            y1 = max(y0 + 1, min(H, int(round((y + h) * H))))
            return image[y0:y1, x0:x1]
        B, H, W = image.shape
        x0 = max(0, min(W - 1, int(round(x * W))))
        y0 = max(0, min(H - 1, int(round(y * H))))
        x1 = max(x0 + 1, min(W, int(round((x + w) * W))))
        y1 = max(y0 + 1, min(H, int(round((y + h) * H))))
        return image[:, y0:y1, x0:x1]

    # IMAGE is BHWC
    B, H, W, C = image.shape
    x0 = max(0, min(W - 1, int(round(x * W))))
    y0 = max(0, min(H - 1, int(round(y * H))))
    x1 = max(x0 + 1, min(W, int(round((x + w) * W))))
    y1 = max(y0 + 1, min(H, int(round((y + h) * H))))
    return image[:, y0:y1, x0:x1, :]


class AdvancedImageLoader:
    """
    Loads an image the same way as the built-in Load Image node, optionally
    crops it to a region selected in the Crop dialog, and also produces a
    second image resized to approximately the requested megapixels.
    """

    @classmethod
    def INPUT_TYPES(cls):
        input_dir = folder_paths.get_input_directory()
        files = [
            f
            for f in os.listdir(input_dir)
            if os.path.isfile(os.path.join(input_dir, f))
        ]
        files = folder_paths.filter_files_content_types(files, ["image"])
        return {
            "required": {
                "image": (sorted(files), {"image_upload": True}),
                "megapixels": (
                    "FLOAT",
                    {
                        "default": 1.0,
                        "min": 0.0,
                        "max": 64.0,
                        "step": 0.05,
                        "tooltip": (
                            "Target megapixels for the downsized output. "
                            "0 = keep original resolution (no resize)."
                        ),
                    },
                ),
                "upscale_method": (
                    [
                        "lanczos",
                        "nearest-exact",
                        "bilinear",
                        "area",
                        "bicubic",
                    ],
                    {
                        "default": "lanczos",
                        "tooltip": "Interpolation method used when resizing.",
                    },
                ),
            },
            # Hidden: written by the JS crop dialog. Normalized box JSON.
            "hidden": {
                "crop": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("IMAGE", "MASK", "IMAGE")
    RETURN_NAMES = ("image", "mask", "image_downsized")
    OUTPUT_TOOLTIPS = (
        "Loaded image after optional crop (full resolution of the crop).",
        "Alpha mask (1 - alpha), cropped to match. Black when source has no alpha.",
        "Cropped image resized to the target megapixel count (aspect ratio kept).",
    )
    FUNCTION = "load_image"
    CATEGORY = "Tallron Handy Nodes"
    DESCRIPTION = (
        "Advanced Image Loader — like the built-in Load Image node, plus:\n"
        "• Crop button opens a dialog; drag a box to select a region; "
        "outputs use that crop (node preview stays full image).\n"
        "• Extra image_downsized output resized to a chosen megapixel budget."
    )

    def _resize_to_megapixels(self, image, megapixels, method):
        """Resize BHWC image so that H*W ≈ megapixels * 1e6, keeping aspect."""
        if image is None or megapixels is None or megapixels <= 0:
            return image

        B, H, W, C = image.shape
        current_mp = (H * W) / 1_000_000.0
        if abs(current_mp - megapixels) < 0.005:
            return image

        ratio = (megapixels * 1_000_000 / (H * W)) ** 0.5
        new_w = max(1, int(round(W * ratio)))
        new_h = max(1, int(round(H * ratio)))

        samples = image.movedim(-1, 1)  # BCHW
        resized = comfy.utils.common_upscale(
            samples, new_w, new_h, method, "disabled"
        )
        return resized.movedim(1, -1)

    def load_image(self, image, megapixels, upscale_method, crop=""):
        image_path = folder_paths.get_annotated_filepath(image)
        crop_box = _parse_crop(crop)

        dtype = comfy.model_management.intermediate_dtype()
        device = comfy.model_management.intermediate_device()

        # Prefer the modern video/image path when available
        try:
            from comfy_api.latest import InputImpl

            components = InputImpl.VideoFromFile(image_path).get_components()
            if components.images is not None and components.images.shape[0] > 0:
                full = components.images.to(device=device, dtype=dtype)
                if components.alpha is not None:
                    mask = (1.0 - components.alpha[..., -1]).to(
                        device=device, dtype=dtype
                    )
                else:
                    mask = torch.zeros(
                        (full.shape[0], full.shape[1], full.shape[2]),
                        dtype=dtype,
                        device=device,
                    )
                full = _apply_crop_tensor(full, crop_box, is_mask=False)
                mask = _apply_crop_tensor(mask, crop_box, is_mask=True)
                downsized = self._resize_to_megapixels(
                    full, megapixels, upscale_method
                )
                return (full, mask, downsized)
        except Exception:
            pass

        # Classic PIL path (animated webp, etc.)
        img = node_helpers.pillow(Image.open, image_path)

        output_images = []
        output_masks = []
        w = h = None

        for frame in ImageSequence.Iterator(img):
            frame = node_helpers.pillow(ImageOps.exif_transpose, frame)

            if frame.mode == "I":
                frame = frame.point(lambda i: i * (1 / 255))

            rgb = frame.convert("RGB")

            if len(output_images) == 0:
                w, h = rgb.size

            if rgb.size[0] != w or rgb.size[1] != h:
                continue

            arr = np.array(rgb).astype(np.float32) / 255.0
            tensor = torch.from_numpy(arr)[None,]

            if "A" in frame.getbands():
                alpha = np.array(frame.getchannel("A")).astype(np.float32) / 255.0
                mask = 1.0 - torch.from_numpy(alpha)
            else:
                mask = torch.zeros((h, w), dtype=torch.float32, device="cpu")

            output_images.append(tensor.to(dtype=dtype))
            output_masks.append(mask.unsqueeze(0).to(dtype=dtype))

        if not output_images:
            empty = torch.zeros((1, 64, 64, 3), dtype=dtype, device=device)
            empty_mask = torch.zeros((1, 64, 64), dtype=dtype, device=device)
            return (empty, empty_mask, empty)

        full = torch.cat(output_images, dim=0).to(device=device, dtype=dtype)
        mask = torch.cat(output_masks, dim=0).to(device=device, dtype=dtype)

        full = _apply_crop_tensor(full, crop_box, is_mask=False)
        mask = _apply_crop_tensor(mask, crop_box, is_mask=True)

        downsized = self._resize_to_megapixels(full, megapixels, upscale_method)
        return (full, mask, downsized)

    @classmethod
    def IS_CHANGED(cls, image, megapixels, upscale_method, crop=""):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, "rb") as f:
            m.update(f.read())
        m.update(f"{megapixels}:{upscale_method}:{crop or ''}".encode("utf-8"))
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(cls, image, megapixels=None, upscale_method=None, crop=None):
        if not folder_paths.exists_annotated_filepath(image):
            return f"Invalid image file: {image}"
        return True


NODE_CLASS_MAPPINGS = {
    "AdvancedImageLoader": AdvancedImageLoader,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AdvancedImageLoader": "Advanced Image Loader",
}
