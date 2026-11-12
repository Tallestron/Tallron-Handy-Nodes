"""Prompt Builder (Tallron)

Three-panel prompt composer:
- Left: categories
- Right: items of the selected category
- Bottom: selected prompt snippets that form the output text

Green +Category button adds a category.
Blue + button adds an item to the active category.
Clicking an item appends it to the bottom composition.
The STRING output is the joined text of the bottom snippets.
"""


class TallronPromptBuilder:
    """
    On-node prompt builder with categories, items, and a composition area.

    - Left panel lists categories (green +Category button above).
    - Right panel lists items of the selected category (blue + button above).
    - Click an item to append its text to the bottom selected snippets.
    - Bottom panel shows the selected snippets; remove or reorder them.
    - STRING output is the bottom text (snippets joined by ", ").
    """

    DESCRIPTION = (
        "Prompt Builder — pick categories on the left, items on the right, "
        "and collect snippets at the bottom. The STRING output is the "
        "composed prompt from the bottom panel."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "builder_json": (
                    "STRING",
                    {
                        "default": "{}",
                        "multiline": True,
                    },
                ),
                "composed_prompt": (
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

    def get_prompt(self, builder_json, composed_prompt):
        text = composed_prompt if isinstance(composed_prompt, str) else ""
        return (text,)


NODE_CLASS_MAPPINGS = {
    "TallronPromptBuilder": TallronPromptBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronPromptBuilder": "Prompt Builder",
}
