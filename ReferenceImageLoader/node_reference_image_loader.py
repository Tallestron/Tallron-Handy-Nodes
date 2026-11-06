"""Reference Image Loader (Tallron)

Up to 10 reference-image slots in a 2-wide grid for edit models.
Empty slots return None (not black images) so they do not slow inference.
"""

import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths
import node_helpers
import comfy.utils


class TallronReferenceImageLoader:
    """
    Up to 10-slot reference image loader (2-wide grid) for edit models.
    Empty slots return None (not black images) so unconnected / optional
    paths do not waste encode time or VRAM.

    index_style:
      - Qwen (1-based): cells/outputs labeled Image 1 … Image 10
      - Flux (0-based): cells/outputs labeled Image 0 … Image 9
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "num_slots": ("INT", {
                    "default": 10,
                    "min": 1,
                    "max": 10,
                    "step": 1,
                    "tooltip": "How many image cells to show (1-10). Ten outputs always exist."
                }),
                "index_style": (
                    ["Qwen (1-based)", "Flux (0-based)"],
                    {
                        "default": "Qwen (1-based)",
                        "tooltip": (
                            "Qwen: first cell/output is Image 1. "
                            "Flux: first cell/output is Image 0."
                        ),
                    },
                ),
                "images_json": ("STRING", {
                    "default": "[]",
                    "multiline": False,
                }),
                "megapixels": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 16.0,
                    "step": 0.05,
                    "tooltip": "Target megapixels for resized outputs & batch (0 = keep original size)"
                }),
                "upscale_method": (["lanczos", "nearest", "bilinear", "bicubic", "area", "nearest-exact"],),
                "fit_mode": (["keep_aspect", "crop", "stretch", "pad"], {
                    "default": "keep_aspect",
                    "tooltip": "How to fit images when resizing to megapixels"
                }),
            }
        }

    # Socket names stay stable for workflow wiring; the frontend renames the
    # visible labels to Image 0…9 when Flux style is selected.
    RETURN_TYPES = (
        "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE",
        "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE",
        "IMAGE", "IMAGE"
    )
    RETURN_NAMES = (
        "Image 1", "Image 2", "Image 3", "Image 4", "Image 5",
        "Image 6", "Image 7", "Image 8", "Image 9", "Image 10",
        "batch", "Image 1 full size"
    )
    FUNCTION = "load"
    CATEGORY = "Tallron"
    DESCRIPTION = (
        "Reference Image Loader — up to 10 reference images in a resizable "
        "2-wide grid. Empty slots return None (no black images). "
        "index_style switches labels between Qwen (Image 1…) and Flux (Image 0…)."
    )

    def _parse_filenames(self, images_json):
        try:
            data = json.loads(images_json) if images_json else []
        except Exception:
            data = []
        if not isinstance(data, list):
            data = []
        out = []
        for i in range(10):
            if i < len(data) and data[i]:
                out.append(str(data[i]).strip())
            else:
                out.append("")
        return out

    def _load_single(self, filename):
        """Returns (image_tensor_or_None, is_empty). Never a black tensor."""
        if not filename:
            return None, True

        image_path = folder_paths.get_annotated_filepath(filename)
        if not os.path.isfile(image_path):
            alt = os.path.join(folder_paths.get_input_directory(), filename)
            if os.path.isfile(alt):
                image_path = alt
            else:
                return None, True

        img = node_helpers.pillow(Image.open, image_path)

        output_images = []
        w = h = None

        for frame in ImageSequence.Iterator(img):
            frame = node_helpers.pillow(ImageOps.exif_transpose, frame)
            if frame.mode == "I":
                frame = frame.point(lambda x: x * (1 / 255))
            image = frame.convert("RGB")

            if len(output_images) == 0:
                w, h = image.size

            if image.size[0] != w or image.size[1] != h:
                continue

            arr = np.array(image).astype(np.float32) / 255.0
            output_images.append(torch.from_numpy(arr)[None,])

        if not output_images:
            return None, True

        if len(output_images) > 1:
            return torch.cat(output_images, dim=0), False
        return output_images[0], False

    def _resize_to_megapixels(self, image, megapixels, method, fit_mode):
        if image is None or megapixels <= 0:
            return image

        B, H, W, C = image.shape
        current_mp = (H * W) / 1_000_000.0
        if abs(current_mp - megapixels) < 0.01:
            return image

        img = image.movedim(-1, 1)  # BCHW

        if fit_mode == "stretch":
            scale = (megapixels / current_mp) ** 0.5
            th = max(1, int(round(H * scale)))
            tw = max(1, int(round(W * scale)))
            resized = comfy.utils.common_upscale(img, tw, th, method, "disabled")
        elif fit_mode == "crop":
            scale = (megapixels / current_mp) ** 0.5
            th = max(1, int(round(H * scale)))
            tw = max(1, int(round(W * scale)))
            resized = comfy.utils.common_upscale(img, tw, th, method, "center")
        elif fit_mode == "pad":
            scale = (megapixels / current_mp) ** 0.5
            th = max(1, int(round(H * scale)))
            tw = max(1, int(round(W * scale)))
            ratio = min(tw / W, th / H)
            nw = max(1, int(round(W * ratio)))
            nh = max(1, int(round(H * ratio)))
            resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")
            pad_w, pad_h = tw - nw, th - nh
            pl, pr = pad_w // 2, pad_w - pad_w // 2
            pt, pb = pad_h // 2, pad_h - pad_h // 2
            resized = torch.nn.functional.pad(
                resized, (pl, pr, pt, pb), mode="constant", value=0.0
            )
        else:  # keep_aspect
            ratio = (megapixels * 1_000_000 / (H * W)) ** 0.5
            nw = max(1, int(round(W * ratio)))
            nh = max(1, int(round(H * ratio)))
            resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")

        return resized.movedim(1, -1)

    def _make_batch(self, resized_list, empty_flags, num_slots):
        loaded = []
        for i in range(min(num_slots, len(resized_list))):
            if not empty_flags[i] and resized_list[i] is not None:
                loaded.append(resized_list[i])

        if not loaded:
            return None

        ref = loaded[0]
        _, rh, rw, _ = ref.shape
        aligned = []
        for img in loaded:
            if img.shape[1] == rh and img.shape[2] == rw:
                aligned.append(img)
            else:
                t = img.movedim(-1, 1)
                t = comfy.utils.common_upscale(t, rw, rh, "lanczos", "center")
                aligned.append(t.movedim(1, -1))
        return torch.cat(aligned, dim=0)

    def load(self, num_slots, index_style, images_json, megapixels, upscale_method, fit_mode):
        # index_style is consumed by the frontend for labels; backend is order-based.
        num_slots = max(1, min(10, int(num_slots)))
        filenames = self._parse_filenames(images_json)

        images = []
        empty_flags = []
        full_size_1 = None

        for i in range(10):
            name = filenames[i] if i < num_slots else ""
            img, is_empty = self._load_single(name)
            if i == 0:
                full_size_1 = img
            images.append(img)
            empty_flags.append(is_empty or (i >= num_slots))

        resized = []
        for img, is_empty in zip(images, empty_flags):
            if is_empty or img is None:
                resized.append(None)
            else:
                resized.append(
                    self._resize_to_megapixels(img, megapixels, upscale_method, fit_mode)
                )

        batch = self._make_batch(resized, empty_flags, num_slots)
        return (*resized, batch, full_size_1)


NODE_CLASS_MAPPINGS = {
    "TallronReferenceImageLoader": TallronReferenceImageLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronReferenceImageLoader": "Reference Image Loader"
}
