"""Note List (Tallron)

A persistent, reorderable list of named notes with expand/collapse and
copy-to-clipboard. Click a note to highlight it and send its text to the
STRING output for wiring into other nodes.
"""


class TallronNoteList:
    """
    On-node note pad with a directory-style list.

    - Add Note creates a blank entry at the top.
    - Title is always visible (double-click to rename); expand (+) reveals content.
    - Drag handle reorders notes.
    - Click a note to highlight it and push its content to the STRING output.
    - Copy on the title row copies content to the clipboard.
    """

    DESCRIPTION = (
        "Note List — keep a reorderable directory of named notes on the node. "
        "Click a note to highlight it and send its text to the STRING socket. "
        "Use Copy on the title row for the clipboard."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # Full list of notes as JSON. Hidden by the frontend; survives
                # workflow save/load. May be a plain array (legacy) or
                # {"notes": [...], "activeId": "..."}.
                "notes_json": (
                    "STRING",
                    {
                        "default": "[]",
                        "multiline": True,
                    },
                ),
                # The note text currently staged for the STRING output.
                # Set by the frontend when the user clicks Output.
                "selected_note": (
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
    FUNCTION = "get_note"
    CATEGORY = "Tallron Handy Nodes"
    OUTPUT_NODE = False

    def get_note(self, notes_json, selected_note):
        # notes_json is only for persistence; the actual payload is selected_note
        text = selected_note if isinstance(selected_note, str) else ""
        return (text,)


NODE_CLASS_MAPPINGS = {
    "TallronNoteList": TallronNoteList,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TallronNoteList": "Note List",
}
