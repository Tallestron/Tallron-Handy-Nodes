# Tallron — ComfyUI Custom Nodes

Utility nodes for ComfyUI. All nodes appear under the **Tallron Handy Nodes** category.

## Included nodes

| Node | Description |
|------|-------------|
| **Advanced Image Loader** | Load Image + interactive crop + megapixel-budget downsized output |
| **Reference Image Loader** | Up to 10 reference images in a 2-wide grid, per-slot crop, MP resize, Qwen/Flux labels |
| **MP Resolution Selector** | On-node resolution picker calibrated to megapixel targets / model profiles |
| **Note List** | Reorderable notes with expand/collapse, click → STRING, copy, import/export |
| **Prompt Vault** | Categorized prompts with 1024×1024 images, resizable preview, Copy → STRING |
| **Prompt Builder** | Three-panel composer: categories, items, selected snippets → STRING |
| **Image Compare** | Side-by-side / overlay / difference viewer for two images |

---

### Advanced Image Loader

- Same load/upload UX as built-in Load Image
- **Crop** dialog (drag box → Apply); crop is saved with the workflow and applied to outputs
- Outputs: `image`, `mask`, `image_downsized`
- Shared megapixel target + upscale method for the downsized output

### Reference Image Loader

- 1–10 slots in a resizable 2-wide grid
- Click, drag-drop, clear (×); reorder by dragging cell headers
- **Crop on every slot**
- `index_style`: Qwen (1-based) or Flux (0-based)
- Shared megapixels / fit mode / upscale method
- Outputs: Image 1–10, `batch`, first image full size
- Empty slots return **None**

### MP Resolution Selector

- On-node UI for width × height from megapixel / aspect presets
- Model-oriented profiles and optional custom ratio / exact size
- Optional image passthrough and latent-related helpers (see node README)

### Note List

- Named notes with expand/collapse, auto-sizing text areas
- **Click a note** to highlight it and stage its content on the `text` STRING output
- **Copy** on the title row copies to the clipboard
- Reorder, delete with confirm; import / export JSON (Markdown import supported)

### Prompt Vault

- **Categories** on the left filter which prompts are shown (All + user categories)
- Named prompts with expand/collapse and auto-sizing text areas
- **Click a row** to select it (green border) and stage the prompt on the `text` STRING output
- **Copy** button copies to clipboard and selects the prompt
- Right-side **image preview**; drag the divider to resize the panel
- **Load Image** resizes the chosen file to 1024×1024 (center-crop cover)
- Click the preview to open a full-size lightbox; **Clear** removes the image
- Reorder, delete with confirm; import / export JSON (categories + images included)

### Prompt Builder

- **Left panel**: categories (green **+ Category** button)
- Left header is the green **+ Category** button (no title text)
- Right header is the blue **+Snippet** button — opens the list-import dialog
- **Copy Prompt** (blue) and **Clear Prompt** (red) sit centered under the snippet list
- Pencil (✎) on a category or snippet renames it
- Drag chips in the bottom snippet window to reorder the prompt
- Lists scroll inside a fixed-height node; resizing the node updates that height
- Click an item to append it to the bottom **Selected snippets**
- Color dots along the top set a rectangular tag color on the selected category
- Dark gray **×** dot clears the selected category's color
- Snippets from categories that share a tag color are joined with a space; different colors (or no color) use a comma
- **+ Category** adds a category and immediately lets you type its name in the list
- Left pane width follows the widest category name
- Resizing the node taller grows the lists; shorter keeps them scrolling
- Bottom panel shows removable chips; STRING output is the composed text
- **Clear Prompt** button (red, centered below the snippet list)
- Drag the ⋮⋮ handle to reorder categories or items
- × on an item asks for confirmation before deleting
- Mouse wheel over a list scrolls that list (does not zoom the canvas)
- **Import / Export** (bottom): full database JSON backup (categories + items + colors + selected). Import can replace or merge
- Double-click category or item names to rename
- Lists scroll instead of growing the node
- Pre-populated with useful categories: Setting, Lighting, People, Hair Styles, Ethnicity, Street Clothing, Lingerie, Swimsuit
- Street Clothing, Lingerie, and Swimsuit share a yellow tag by default (space-joined)
- State is saved with the workflow

### Image Compare

- Optional `image1` / `image2` inputs (no hard error if one is missing)
- Modes: Show 1/2, Left–Right / Right–Left wipe, Up–Down wipe, Overlay, Difference
- Save / Copy in single-image modes

---

## Installation

1. Copy the entire package folder into `ComfyUI/custom_nodes/`
2. Restart ComfyUI
3. Hard-refresh the browser (Ctrl+F5)

Nodes appear under **Tallron Handy Nodes**.

## Project layout

```
Tallron-Handy-Nodes/
├── __init__.py                 # Registers all nodes
├── README.md
├── js/                         # Shared frontend scripts
│   ├── load_image_downsizer.js
│   ├── reference_loader.js
│   ├── mp_resolution.js
│   ├── note_list.js
│   ├── prompt_vault.js
│   ├── prompt_builder.js
│   └── image_compare.js
├── LoadImageDownsizer/
├── ReferenceImageLoader/
├── MP_Resolution/
├── NoteList/
├── PromptVault/
├── PromptBuilder/
└── ImageCompare/
```

Future nodes: add a sibling package under the root and register it in the top-level `__init__.py`.
