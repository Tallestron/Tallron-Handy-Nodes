"""MP Resolution Selector (Tallron) — resolution picker with optional image
passthrough, latent output, Use-Input switch, and Scale-input dropdown.

When Use Input Resolution is ON, size comes only from the connected image
(width/height sockets are ignored)."""

import json
import math

import torch
import torch.nn.functional as F

DEFAULT_STATE = {
    "mode": "preset",
    "ratio": "1:1",
    "w": 1024,
    "h": 1024,
    "custom_w": 1024,
    "custom_h": 1024,
    "custom_ratio_w": 4,
    "custom_ratio_h": 3,
    "snap": 16,
    "use_input": False,
    "scale_mode": "keep",  # "keep" | "2k" | "3k" | "4k"
}

SCALE_TARGETS = {
    "2k": 2048,
    "3k": 3072,
    "4k": 4096,
}


def _clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def _image_wh(image):
    """Return (width, height) from a ComfyUI IMAGE tensor [B,H,W,C] or [B,C,H,W]."""
    if image is None:
        return None
    try:
        s = image.shape
        if len(s) != 4:
            return None
        if int(s[-1]) in (1, 3, 4):
            return int(s[2]), int(s[1])
        if int(s[1]) in (1, 3, 4):
            return int(s[3]), int(s[2])
        return int(s[2]), int(s[1])
    except Exception:
        return None


def _scale_to_area(w: int, h: int, target_side: int, snap: int = 16):
    """Scale so total pixels ≈ target_side², preserving aspect ratio."""
    if w <= 0 or h <= 0 or target_side <= 0:
        return w, h
    target_pixels = float(target_side) * float(target_side)
    aspect = w / float(h)
    nw = int(round(math.sqrt(target_pixels * aspect)))
    nh = int(round(math.sqrt(target_pixels / aspect)))
    if snap > 1:
        nw = max(snap, int(round(nw / snap) * snap))
        nh = max(snap, int(round(nh / snap) * snap))
    return _clamp(nw, 64, 16384), _clamp(nh, 64, 16384)


def _resize_image(image, width: int, height: int):
    """Resize IMAGE tensor [B,H,W,C] to width × height (bilinear)."""
    if image is None:
        return None
    wh = _image_wh(image)
    if wh and wh[0] == width and wh[1] == height:
        return image
    x = image.movedim(-1, 1).float()
    x = F.interpolate(x, size=(height, width), mode="bilinear", align_corners=False)
    return x.movedim(1, -1)


def _empty_latent(
    width: int,
    height: int,
    batch_size: int = 1,
    latent_format: str = "krea2",
):
    if latent_format in ("flux2", "flux3"):
        channels, scale = 128, 16
    elif latent_format == "qwen_image_21":
        channels, scale = 64, 16
    elif latent_format == "krea2":
        channels, scale = 16, 8
    else:
        channels, scale = 4, 8
    return {
        "samples": torch.zeros(
            [batch_size, channels, max(1, height // scale), max(1, width // scale)]
        ),
    }


def _blank_image(width: int, height: int, batch_size: int = 1):
    return torch.zeros([batch_size, height, width, 3])


class TallronMPResolutionSelector:
    DESCRIPTION = (
        "Resolution Selector — model-profiled resolution picker, plus optional "
        "image input and latent + image outputs.\n\n"
        "Use Input Resolution: when ON, size comes only from the connected "
        "image (width/height sockets are ignored). Image is passed through; "
        "width, height, and latent match the image size.\n"
        "Scale input image: Keep Same, or rescale total pixel area to 2K / 3K / 4K "
        "while keeping aspect ratio.\n"
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "ResolutionState": (
                    "STRING",
                    {
                        "default": json.dumps(DEFAULT_STATE),
                        "multiline": True,
                    },
                ),
                "latent_format": (
                    ["krea2", "flux3", "flux2", "qwen_image_21", "standard"],
                    {
                        "default": "krea2",
                        "tooltip": "Krea 2: 16ch/8x; FLUX 3: 128ch/16x; Qwen-Image 2.1: 64ch/16x; standard: 4ch/8x.",
                    },
                ),
            },
            "optional": {
                "image": ("IMAGE",),
                "width": (
                    "INT",
                    {
                        "default": 0,
                        "min": 0,
                        "max": 16384,
                        "step": 1,
                        "forceInput": True,
                    },
                ),
                "height": (
                    "INT",
                    {
                        "default": 0,
                        "min": 0,
                        "max": 16384,
                        "step": 1,
                        "forceInput": True,
                    },
                ),
            },
        }

    RETURN_TYPES = ("IMAGE", "INT", "INT", "LATENT")
    RETURN_NAMES = ("image", "width", "height", "latent")
    OUTPUT_TOOLTIPS = (
        "Passthrough or scaled image matching the output resolution.",
        "Image width when Use Input is on; otherwise the chosen width.",
        "Image height when Use Input is on; otherwise the chosen height.",
        "Empty latent matching width × height and latent format.",
    )
    FUNCTION = "get_resolution"
    CATEGORY = "Tallron"

    def get_resolution(
        self,
        ResolutionState: str,
        latent_format: str,
        image=None,
        width=None,
        height=None,
    ):
        try:
            state = json.loads(ResolutionState) if ResolutionState else {}
            if not isinstance(state, dict):
                state = {}
        except Exception:
            state = {}

        use_input = bool(state.get("use_input", False))

        if "scale_mode" in state:
            scale_mode = str(state.get("scale_mode") or "keep").lower()
        elif state.get("fit_2k"):
            scale_mode = "2k"
        else:
            scale_mode = "keep"
        if scale_mode not in SCALE_TARGETS and scale_mode != "keep":
            scale_mode = "keep"

        snap = int(state.get("snap", 16) or 16)

        img_wh = _image_wh(image)
        img_w = int(img_wh[0]) if img_wh else 0
        img_h = int(img_wh[1]) if img_wh else 0

        picker_w = _clamp(int(state.get("w", 1024) or 1024), 64, 16384)
        picker_h = _clamp(int(state.get("h", 1024) or 1024), 64, 16384)

        if use_input:
            # Size comes ONLY from the connected image — W/H sockets ignored.
            if img_w > 0 and img_h > 0:
                out_w, out_h = img_w, img_h
            else:
                # No image connected: fall back to picker so the graph still runs.
                out_w, out_h = picker_w, picker_h
        else:
            out_w, out_h = picker_w, picker_h

        out_w = _clamp(out_w, 64, 16384)
        out_h = _clamp(out_h, 64, 16384)

        if scale_mode in SCALE_TARGETS:
            out_w, out_h = _scale_to_area(out_w, out_h, SCALE_TARGETS[scale_mode], snap)

        if image is not None:
            if img_w != out_w or img_h != out_h:
                out_image = _resize_image(image, out_w, out_h)
            else:
                out_image = image
            batch = int(image.shape[0])
        else:
            batch = 1
            out_image = _blank_image(out_w, out_h, batch)

        latent = _empty_latent(out_w, out_h, batch, latent_format)
        return (out_image, out_w, out_h, latent)


NODE_CLASS_MAPPINGS = {"TallronMPResolutionSelector": TallronMPResolutionSelector}
NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronMPResolutionSelector": "MP Resolution Selector"
}
