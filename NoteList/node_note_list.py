"""Note List (Tallron)

A persistent, reorderable list of named notes with expand/collapse,
copy-to-clipboard, and an Output button that pushes the note text to the
STRING output for wiring into other nodes.
"""


class TallronNoteList:
    """
    On-node note pad with a directory-style list.

    - Add Note creates a blank entry at the top.
    - Title is always visible (double-click to rename); expand (+) reveals
      content + Copy / Output.
    - Drag handle reorders notes.
    - Output writes the note content into the STRING output and highlights
      that note as the active source.
    """

    DESCRIPTION = (
        "Note List — keep a reorderable directory of named notes on the node. "
        "Expand a note to edit its content, copy it, or Output it to the STRING "
        "socket so it can be wired into any other node. The active note is "
        "highlighted."
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
