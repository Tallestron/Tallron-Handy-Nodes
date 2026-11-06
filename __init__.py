"""
Tallron — collection of ComfyUI custom nodes.

Install: put this folder in ComfyUI/custom_nodes/ and restart ComfyUI.
Nodes appear under the "Tallron" category.
"""

from importlib import import_module

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}


def _load(submodule, label):
    """Import one node module; skip on error so other nodes still register."""
    try:
        mod = import_module(submodule, package=__name__)
        NODE_CLASS_MAPPINGS.update(getattr(mod, "NODE_CLASS_MAPPINGS", {}) or {})
        NODE_DISPLAY_NAME_MAPPINGS.update(getattr(mod, "NODE_DISPLAY_NAME_MAPPINGS", {}) or {})
    except Exception as e:
        print(f"[Tallron] WARNING: failed to load {label}: {e}")


_load(".MP_Resolution.node_mp_resolution", "MP Resolution")
_load(".LoadImageDownsizer.node_load_image_downsizer", "Advanced Image Loader")
_load(".ReferenceImageLoader.node_reference_image_loader", "Reference Image Loader")
_load(".NoteList.node_note_list", "Note List")
_load(".ImageCompare.node_image_compare", "Image Compare")

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
