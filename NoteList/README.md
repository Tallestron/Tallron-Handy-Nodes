# Note List (Tallron)

On-node directory of named notes with expand/collapse, drag-to-reorder,
copy-to-clipboard, and an **Output** button that pushes the note text to the
STRING socket (`text`).

## Features

- **Add Note** — inserts a blank note at the top of the list
- **Title** always visible — **double-click** to rename
- **+ / −** expands or collapses the note body
- Expanded textareas **auto-size** to fit the full content
- **Copy** — copies note content to the system clipboard
- **Output** — always visible on the title row (left of ×); writes the note
  content into the node's `text` STRING output and highlights that note as active
- **Drag handle** on the left of each row to reorder notes
- **Delete (×)** asks for confirmation before removing a note
- Notes (and which one is active) persist inside the workflow
- **Import / Export** at the bottom of the node — pretty JSON backup (Import
  also accepts a simple Markdown layout)
- Right-click on a title or note body uses the **browser text menu**
  (Cut / Copy / Paste / spelling suggestions)

## Usage

1. Drop the node from the **Tallron** category
2. Click **Add Note**, double-click the title to name it, expand and type
3. Click **Output** on the note you want to use (green border = active)
4. Connect the `text` output to any STRING input
5. **Export** saves a JSON backup; **Import** loads it back (replace or append)

## Backup format

Export writes pretty-printed JSON:

```json
{
  "format": "tallron-notes",
  "version": 1,
  "exported": "2026-10-29T17:00:00.000Z",
  "notes": [
    { "title": "Prompt A", "content": "..." },
    { "title": "Prompt B", "content": "..." }
  ]
}
```

Import also accepts the same structure, a plain JSON array of notes, or a
Markdown-style file with `# Title` blocks separated by `---`.
