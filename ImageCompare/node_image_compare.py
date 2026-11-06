"""Image Compare (Tallron)

Side-by-side / overlay / difference viewer for two IMAGE inputs.
Frontend lives in js/image_compare.js.
"""

import torch


class TallronImageCompare:
    """
    Pass-through dual IMAGE node whose UI compares the two inputs.
    Outputs both images unchanged for downstream wiring.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "image_b": ("IMAGE",),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("image_a", "image_b")
    FUNCTION = "compare"
    CATEGORY = "Tallron"
    DESCRIPTION = (
        "Image Compare — side-by-side, overlay, or difference view of two images. "
        "Outputs both images unchanged."
    )

    def compare(self, image_a, image_b):
        return (image_a, image_b)


NODE_CLASS_MAPPINGS = {
    "TallronImageCompare": TallronImageCompare,
    "TallronCompare": TallronImageCompare,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronImageCompare": "Image Compare",
    "TallronCompare": "Image Compare",
}
