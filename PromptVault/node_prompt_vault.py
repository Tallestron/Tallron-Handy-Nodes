"""Prompt Vault (Tallron)

A persistent, categorized library of named prompts with optional 1024×1024
reference images. Categories on the left filter the prompt list; click a
prompt to preview its image; Copy stages the text on the STRING output.
"""


class TallronPromptVault:
    """
    On-node prompt vault with categories and image previews.

    - Categories (left panel) filter which prompts are shown.
    - Add Prompt creates a blank entry in the active category.
    - Title is always visible (double-click to rename); expand (+) reveals
      the editable prompt body.
    - Click a row to select it: highlights the row, shows the saved image
      on the right, and stages the prompt text on the STRING output.
    - Copy button copies the prompt to the clipboard (and refreshes output).
    - Load Image (under the preview) opens a file picker, resizes the image
      to 1024×1024 (center-crop cover), and stores it with the selected prompt.
    - Click the preview image to view the full 1024 image in a lightbox.
    - Divider between list and preview is draggable.
    - Drag handle reorders prompts. Import / Export backup JSON (with images).
    """

    DESCRIPTION = (
        "Prompt Vault — categorized library of named prompts with optional "
        "1024×1024 reference images. Pick a category on the left, select a "
        "prompt to preview its image; Copy sends the text to the STRING "
        "socket and the clipboard."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "prompts_json": (
                    "STRING",
                    {
                        "default": "[]",
                        "multiline": True,
                    },
                ),
                "selected_prompt": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "get_prompt"
    CATEGORY = "Tallron Handy Nodes"
    OUTPUT_NODE = False

    def get_prompt(self, prompts_json, selected_prompt):
        text = selected_prompt if isinstance(selected_prompt, str) else ""
        return (text,)


NODE_CLASS_MAPPINGS = {
    "TallronPromptVault": TallronPromptVault,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronPromptVault": "Prompt Vault",
}
