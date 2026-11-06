"""Reference Image Loader (Tallron)

Up to 10 reference-image slots in a 2-wide grid for edit models.
Empty slots return None (not black images) so they do not slow inference.
Image 1 supports interactive crop (same dialog as Advanced Image Loader).
"""

import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths
import node_helpers
import comfy.utils


def _parse_crop(crop_str):
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
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.0, min(1.0 - x, w))
    h = max(0.0, min(1.0 - y, h))
    if w < 0.001 or h < 0.001:
        return None
    if abs(x) < 1e-4 and abs(y) < 1e-4 and abs(w - 1.0) < 1e-4 and abs(h - 1.0) < 1e-4:
        return None
    return (x, y, w, h)


def _apply_crop_tensor(image, crop):
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
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "num_slots": ("INT", {"default": 10, "min": 1, "max": 10, "step": 1}),
                "index_style": (["Qwen (1-based)", "Flux (0-based)"], {"default": "Qwen (1-based)"}),
                "images_json": ("STRING", {"default": "[]", "multiline": False}),
                "megapixels": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 16.0, "step": 0.05}),
                "upscale_method": (["lanczos", "nearest", "bilinear", "bicubic", "area", "nearest-exact"],),
                "fit_mode": (["keep_aspect", "crop", "stretch", "pad"], {"default": "keep_aspect"}),
            },
            "hidden": {"crop": ("STRING", {"default": ""})},
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("Image 1", "Image 2", "Image 3", "Image 4", "Image 5", "Image 6", "Image 7", "Image 8", "Image 9", "Image 10", "batch", "Image 1 full size")
    FUNCTION = "load"
    CATEGORY = "Tallron"
    DESCRIPTION = "Reference Image Loader — up to 10 reference images. Empty slots return None. Image 1 supports crop."

    def _parse_filenames(self, images_json):
        try:
            data = json.loads(images_json) if images_json else []
        except Exception:
            data = []
        if not isinstance(data, list):
            data = []
        return [(str(data[i]).strip() if i < len(data) and data[i] else "") for i in range(10)]

    def _load_single(self, filename):
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
            th, tw = max(1, int(round(H * scale))), max(1, int(round(W * scale)))
            resized = comfy.utils.common_upscale(img, tw, th, method, "disabled")
        elif fit_mode == "crop":
            scale = (megapixels / current_mp) ** 0.5
            th, tw = max(1, int(round(H * scale))), max(1, int(round(W * scale)))
            resized = comfy.utils.common_upscale(img, tw, th, method, "center")
        elif fit_mode == "pad":
            scale = (megapixels / current_mp) ** 0.5
            th, tw = max(1, int(round(H * scale))), max(1, int(round(W * scale)))
            ratio = min(tw / W, th / H)
            nw, nh = max(1, int(round(W * ratio))), max(1, int(round(H * ratio)))
            resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")
            pad_w, pad_h = tw - nw, th - nh
            pl, pr = pad_w // 2, pad_w - pad_w // 2
            pt, pb = pad_h // 2, pad_h - pad_h // 2
            resized = torch.nn.functional.pad(resized, (pl, pr, pt, pb), mode="constant", value=0.0)
        else:
            ratio = (megapixels * 1_000_000 / (H * W)) ** 0.5
            nw, nh = max(1, int(round(W * ratio))), max(1, int(round(H * ratio)))
            resized = comfy.utils.common_upscale(img, nw, nh, method, "disabled")
        return resized.movedim(1, -1)

    def _make_batch(self, resized_list, empty_flags, num_slots):
        loaded = [resized_list[i] for i in range(min(num_slots, len(resized_list))) if not empty_flags[i] and resized_list[i] is not None]
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

    def load(self, num_slots, index_style, images_json, megapixels, upscale_method, fit_mode, crop=""):
        num_slots = max(1, min(10, int(num_slots)))
        filenames = self._parse_filenames(images_json)
        crop_box = _parse_crop(crop)
        images, empty_flags = [], []
        full_size_1 = None
        for i in range(10):
            name = filenames[i] if i < num_slots else ""
            img, is_empty = self._load_single(name)
            if i == 0 and img is not None and crop_box is not None:
                img = _apply_crop_tensor(img, crop_box)
            if i == 0:
                full_size_1 = img
            images.append(img)
            empty_flags.append(is_empty or (i >= num_slots))
        resized = [None if (e or img is None) else self._resize_to_megapixels(img, megapixels, upscale_method, fit_mode) for img, e in zip(images, empty_flags)]
        batch = self._make_batch(resized, empty_flags, num_slots)
        return (*resized, batch, full_size_1)


NODE_CLASS_MAPPINGS = {"TallronReferenceImageLoader": TallronReferenceImageLoader}
NODE_DISPLAY_NAME_MAPPINGS = {"TallronReferenceImageLoader": "Reference Image Loader"}
