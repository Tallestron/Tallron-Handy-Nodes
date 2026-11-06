"""
Tallron — collection of ComfyUI custom nodes.

Place this entire folder inside ComfyUI/custom_nodes/ and restart.
All nodes appear under the "Tallron" category.
"""

from .MP_Resolution.node_mp_resolution import (
    NODE_CLASS_MAPPINGS as _MP_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as _MP_DISPLAY,
)
from .LoadImageDownsizer.node_load_image_downsizer import (
    NODE_CLASS_MAPPINGS as _LID_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as _LID_DISPLAY,
)
from .ReferenceImageLoader.node_reference_image_loader import (
    NODE_CLASS_MAPPINGS as _RIL_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as _RIL_DISPLAY,
)
from .NoteList.node_note_list import (
    NODE_CLASS_MAPPINGS as _NL_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as _NL_DISPLAY,
)
from .ImageCompare.node_image_compare import (
    NODE_CLASS_MAPPINGS as _IC_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS as _IC_DISPLAY,
)

NODE_CLASS_MAPPINGS = {}
NODE_CLASS_MAPPINGS.update(_MP_MAPPINGS)
NODE_CLASS_MAPPINGS.update(_LID_MAPPINGS)
NODE_CLASS_MAPPINGS.update(_RIL_MAPPINGS)
NODE_CLASS_MAPPINGS.update(_NL_MAPPINGS)
NODE_CLASS_MAPPINGS.update(_IC_MAPPINGS)

NODE_DISPLAY_NAME_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS.update(_MP_DISPLAY)
NODE_DISPLAY_NAME_MAPPINGS.update(_LID_DISPLAY)
NODE_DISPLAY_NAME_MAPPINGS.update(_RIL_DISPLAY)
NODE_DISPLAY_NAME_MAPPINGS.update(_NL_DISPLAY)
NODE_DISPLAY_NAME_MAPPINGS.update(_IC_DISPLAY)

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
