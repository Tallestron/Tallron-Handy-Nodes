"""Image Compare (Tallron)

Side-by-side / overlay / difference viewer for two IMAGE inputs.
Both inputs are optional so muted or bypassed branches never raise a
missing-input system error.
"""

import os
import random
import numpy as np
from PIL import Image
import folder_paths


class TallronCompare:
    DESCRIPTION = (
        "Image Compare — the easiest way to see the difference between "
        "two images. Wire any two IMAGE outputs into image1 and image2 (e.g. "
        "before / after upscaling, original / inpainted, two checkpoint variants), "
        "then run the workflow.\n\n"
        "The on-node viewer offers side-by-side with a draggable slider, "
        "overlap with adjustable opacity, or 'diff' which highlights "
        "exactly what changed between the two.\n\n"
        "Both inputs are optional. If only one image is connected (for example "
        "when a branch feeding one input is muted or bypassed), the node just "
        "shows that image; if neither is connected it shows a short note — it "
        "never throws a system error, so it is safe to leave in a workflow that "
        "toggles between text-to-image and image-to-image."
    )

    def __init__(self):
        self.output_dir = folder_paths.get_temp_directory()
        self.type = "temp"
        self.prefix_append = "_tlrcmp_" + "".join(
            random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(5)
        )
        self.compress_level = 4

    @classmethod
    def INPUT_TYPES(s):
        # Both optional so a muted / bypassed / unconnected branch does NOT
        # raise ComfyUI's "required input is missing" system error.
        return {
            "optional": {
                "image1": (
                    "IMAGE",
                    {
                        "tooltip": (
                            "First image to compare (e.g. the 'before' image). "
                            "Optional — if it isn't connected, or its branch is "
                            "muted / bypassed, the node just shows the other image "
                            "(or a note) instead of throwing an error."
                        ),
                    },
                ),
                "image2": (
                    "IMAGE",
                    {
                        "tooltip": (
                            "Second image to compare (e.g. the 'after' image). "
                            "Optional — the on-node viewer compares once BOTH "
                            "images arrive; with only one connected it simply "
                            "shows that one, and with neither it shows a short note."
                        ),
                    },
                ),
            }
        }

    RETURN_TYPES = ()
    FUNCTION = "compare_images"
    OUTPUT_NODE = True
    CATEGORY = "Tallron"

    def compare_images(self, image1=None, image2=None):
        # Tag each saved image with its slot (1 / 2) so the frontend maps it to
        # the right side even when only one is present.
        pairs = [(1, image1), (2, image2)]
        present = [(slot, t) for (slot, t) in pairs if t is not None]

        results = []
        if present:
            first = present[0][1]
            prefix = "tallron_compare" + self.prefix_append
            full_output_folder, filename, counter, subfolder, _ = (
                folder_paths.get_save_image_path(
                    prefix,
                    self.output_dir,
                    first[0].shape[1],
                    first[0].shape[0],
                )
            )
            for (slot, tensor) in present:
                i = 255.0 * tensor[0].cpu().numpy()
                img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
                file = f"{filename}_{counter:05}_.png"
                img.save(
                    os.path.join(full_output_folder, file),
                    compress_level=self.compress_level,
                )
                results.append(
                    {
                        "filename": file,
                        "subfolder": subfolder,
                        "type": self.type,
                        "slot": slot,
                    }
                )
                counter += 1

        return {"ui": {"images": results}}


NODE_CLASS_MAPPINGS = {
    "TallronCompare": TallronCompare,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronCompare": "Image Compare",
}
