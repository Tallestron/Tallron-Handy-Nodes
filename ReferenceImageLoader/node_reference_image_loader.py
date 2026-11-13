"""Reference Image Loader (Tallron)

Up to 10 reference-image slots in a 2-wide grid for edit models.
Empty slots return None (not black images) so they do not slow inference.
Every slot supports interactive crop (same dialog as Advanced Image Loader).
"""

import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths
import node_helpers
import comfy.utils


def _parse_one_crop(data):
    """Parse a single crop dict → (x,y,w,h) or None."""
    if not isinstance(data, dict):
        return None
    try:
        x = float(data.get("x", 0))
        y = float(data.get("y", 0))
        w = float(data.get("w", 1))
        h = float(data.get("h", 1))
    except (TypeError, ValueError):
        return None
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.0, min(1.0 - x, w))
    h = max(0.0, min(1.0 - y, h))
    if w < 0.001 or h < 0.001:
        return None
    if abs(x) < 1e-4 and abs(y) < 1e-4 and abs(w - 1.0) < 1e-4 and abs(h - 1.0) < 1e-4:
        return None
    return (x, y, w, h)


def _parse_crops(crop_str):
    """
    Parse crop JSON from the frontend.
    Accepts:
      - list of 10 boxes (or nulls): [{"x":..}, null, ...]
      - single box dict (legacy Image-1 only) → applied to slot 0
      - empty / invalid → ten Nones
    """
    empty = [None] * 10
    if not crop_str or not str(crop_str).strip():
        return empty
    try:
        data = json.loads(crop_str)
    except Exception:
        return empty
    if isinstance(data, dict) and "x" in data:
        # Legacy single-box format
        box = _parse_one_crop(data)
        out = empty[:]
        out[0] = box
        return out
    if isinstance(data, list):
        out = []
        for i in range(16):
            if i < len(data) and data[i]:
                out.append(_parse_one_crop(data[i]))
            else:
                out.append(None)
        return out
    return empty


def _apply_crop_tensor(image, crop):
    """Crop a BHWC image tensor using normalized (x, y, w, h)."""
    if crop is None or image is None:
        return image
    x, y, w, h = crop
    B, H, W, C = image.shape
    x0 = max(0, min(W - 1, int(round(x * W))))
    y0 = max(0, min(H - 1, int(round(y * H))))
    x1 = max(x0 + 1, min(W, int(round((x + w) * W))))
    y1 = max(y0 + 1, min(H, int(round((y + h) * H))))
    return image[:, y0:y1, x0:x1, :]


class TallronReferenceImageLoader:
    """
    Up to 10-slot reference image loader (2-wide grid) for edit models.
    Empty slots return None. Every slot supports interactive crop.

    index_style:
      - Qwen (1-based): cells/outputs labeled Image 1 … Image 10
      - Flux (0-based): cells/outputs labeled Image 0 … Image 9
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "num_slots": ("INT", {
                    "default": 2,
                    "min": 1,
                    "max": 16,
                    "step": 1,
                    "tooltip": "How many image cells to show (1-16)."
                }),
                "layout_width": ("INT", {
                    "default": 2,
                    "min": 2,
                    "max": 4,
                    "step": 1,
                    "tooltip": "Grid columns (2, 3, or 4). Node width auto-adjusts."
                }),
                "index_style": (
                    ["1-based", "0-based"],
                    {
                        "default": "1-based",
                        "tooltip": "1-based: first cell/output is Image 1. 0-based: first is Image 0.",
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
                    "tooltip": "Target megapixels for the individual Image outputs (0 = keep original size)."
                }),
                "upscale_method": (["lanczos", "nearest", "bilinear", "bicubic", "area", "nearest-exact"],),
                "fit_mode": (["keep_aspect", "crop", "stretch", "pad"], {
                    "default": "keep_aspect",
                    "tooltip": "How to fit images when resizing individual outputs to megapixels"
                }),
                "batch_longest": ("INT", {
                    "default": 0,
                    "min": 0,
                    "max": 8192,
                    "step": 64,
                    "tooltip": "Scale every full-batch image so its longest side equals this (pixels). 0 = off. Shorter side is padded on one side."
                }),
                "multiple": (["8", "16", "32", "64"], {
                    "default": "16",
                    "tooltip": "Round image and batch dimensions up to a multiple of this value."
                }),
            },
            "hidden": {
                "crop": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("IMAGE", "IMAGE") + ("IMAGE",) * 16
    RETURN_NAMES = ("Image 1 orig size", "full batch") + tuple(
        f"Image {i}" for i in range(1, 17)
    )
    FUNCTION = "load"
    CATEGORY = "Tallron Handy Nodes"
    DESCRIPTION = (
        "Reference Image Loader — up to 16 reference images in a resizable "
        "2-wide grid. Empty slots return None. "
        "Each slot has a Crop button (top-left of the preview). "
        "Outputs, top to bottom: Image 1 orig size, full batch, then Image 1–16. "
        "Image 1 and Image 2 stay visible; Image 3 appears when Image 2 is connected, and so on. "
        "full batch carries the full-resolution images (after crop). "
        "Optional batch_longest scales them to a longest side and pads the other side. "
        "layout_width sets grid columns (2–4). "
        "index_style: 1-based or 0-based labels."
    )

    def _parse_filenames(self, images_json):
        try:
            data = json.loads(images_json) if images_json else []
        except Exception:
            data = []
        if not isinstance(data, list):
            data = []
        out = []
        for i in range(16):
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

        img = image.movedim(-1, 1)

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
        else:
            ratio = (megapixels * 1_000_000 / (H * W)) ** 0.5
            nw = max(1, int(round(W * ratio)))
            nh = max(1, int(round(H * ratio)))
            resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")

        return resized.movedim(1, -1)

    def _round_multiple(self, n, multiple):
        if multiple <= 1:
            return max(1, n)
        return max(multiple, ((int(n) + multiple - 1) // multiple) * multiple)

    def _scale_longest(self, image, longest, method, multiple=1):
        """Scale so the longest side equals `longest` (or keep size if 0), then snap to multiple."""
        if image is None:
            return image
        B, H, W, C = image.shape
        if longest and int(longest) > 0:
            cur = max(H, W)
            scale = float(longest) / float(cur)
            nw = max(1, int(round(W * scale)))
            nh = max(1, int(round(H * scale)))
        else:
            nw, nh = W, H
        nw = self._round_multiple(nw, multiple)
        nh = self._round_multiple(nh, multiple)
        if nw == W and nh == H:
            return image
        img = image.movedim(-1, 1)
        resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")
        return resized.movedim(1, -1)

    def _make_batch(self, image_list, empty_flags, num_slots, batch_longest=0, method="lanczos", multiple=16):
        """
        Build the full batch.

        If batch_longest > 0, each image is scaled so its longest side equals that
        value (aspect preserved). Dimensions are rounded up to `multiple`.
        Images are padded on one side (right / bottom) to a common canvas.
        """
        loaded = []
        for i in range(min(num_slots, len(image_list))):
            if not empty_flags[i] and image_list[i] is not None:
                loaded.append(image_list[i])

        if not loaded:
            return None

        multiple = max(1, int(multiple or 1))
        longest = int(batch_longest or 0)
        loaded = [self._scale_longest(img, longest, method, multiple) for img in loaded]

        max_h = max(img.shape[1] for img in loaded)
        max_w = max(img.shape[2] for img in loaded)
        max_h = self._round_multiple(max_h, multiple)
        max_w = self._round_multiple(max_w, multiple)

        aligned = []
        for img in loaded:
            _, h, w, _ = img.shape
            if h == max_h and w == max_w:
                aligned.append(img)
                continue
            pad_h = max_h - h
            pad_w = max_w - w
            # Even padding on both sides (center)
            pt, pb = pad_h // 2, pad_h - pad_h // 2
            pl, pr = pad_w // 2, pad_w - pad_w // 2
            padded = torch.nn.functional.pad(
                img, (0, 0, pl, pr, pt, pb), mode="constant", value=0.0
            )
            aligned.append(padded)

        return torch.cat(aligned, dim=0)

    def load(self, num_slots, layout_width, index_style, images_json, megapixels, upscale_method, fit_mode, batch_longest=0, multiple="16", crop=""):
        num_slots = max(1, min(16, int(num_slots)))
        try:
            multiple = int(multiple)
        except Exception:
            multiple = 16
        filenames = self._parse_filenames(images_json)
        crop_boxes = _parse_crops(crop)

        images = []
        empty_flags = []
        full_size_1 = None

        for i in range(16):
            name = filenames[i] if i < num_slots else ""
            img, is_empty = self._load_single(name)
            if img is not None and crop_boxes[i] is not None:
                img = _apply_crop_tensor(img, crop_boxes[i])
            if i == 0:
                full_size_1 = img
            images.append(img)
            empty_flags.append(is_empty or (i >= num_slots))

        resized = []
        for img, is_empty in zip(images, empty_flags):
            if is_empty or img is None:
                resized.append(None)
            else:
                r = self._resize_to_megapixels(img, megapixels, upscale_method, fit_mode)
                if r is not None and multiple > 1:
                    B, H, W, C = r.shape
                    nh = self._round_multiple(H, multiple)
                    nw = self._round_multiple(W, multiple)
                    if nh != H or nw != W:
                        t = r.movedim(-1, 1)
                        t = comfy.utils.common_upscale(t, nw, nh, upscale_method, "disabled")
                        r = t.movedim(1, -1)
                resized.append(r)

        full_batch = self._make_batch(images, empty_flags, num_slots, batch_longest, upscale_method, multiple)
        # Preview and most IMAGE nodes cannot accept None. Empty batch/orig get a
        # tiny placeholder so connected PreviewImage nodes do not crash.
        if full_batch is None:
            full_batch = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        if full_size_1 is None:
            full_size_1 = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        return (full_size_1, full_batch, *resized)


NODE_CLASS_MAPPINGS = {
    "TallronReferenceImageLoader": TallronReferenceImageLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronReferenceImageLoader": "Reference Image Loader"
}
