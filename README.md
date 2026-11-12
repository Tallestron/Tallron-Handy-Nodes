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
│   └── image_compare.js
├── LoadImageDownsizer/
├── ReferenceImageLoader/
├── MP_Resolution/
├── NoteList/
├── PromptVault/
└── ImageCompare/
```

Future nodes: add a sibling package under the root and register it in the top-level `__init__.py`.
