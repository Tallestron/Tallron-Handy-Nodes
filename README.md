# Tallron — ComfyUI Custom Nodes

Utility nodes for ComfyUI. All nodes appear under the **Tallron Handy Nodes** category.

## Included nodes

| Node | Description |
|------|-------------|
| **Advanced Image Loader** | Load Image + interactive crop + megapixel-budget downsized output |
| **Reference Image Loader** | Up to 10 reference images in a 2-wide grid, per-slot crop, MP resize, Qwen/Flux labels |
| **MP Resolution Selector** | On-node resolution picker calibrated to megapixel targets / model profiles |
| **Note List** | Reorderable notes with expand/collapse, copy, Output → STRING, import/export |
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
- **Output** selects the active note into the `text` STRING output
- Reorder, copy, delete with confirm; import / export JSON (Markdown import supported)

### Image Compare

- Optional `image1` / `image2` inputs (no hard error if one is missing)
- Modes: Show 1/2, Left–Right / Right–Left wipe, Up–Down wipe, Overlay, Difference
- Save / Copy in single-image modes

---

## Installation

1. Copy the entire `tallron` folder into `ComfyUI/custom_nodes/`
2. Restart ComfyUI
3. Hard-refresh the browser (Ctrl+F5)

Nodes appear under **Tallron Handy Nodes**.

## Project layout

```
tallron/
├── __init__.py                 # Registers all nodes
├── README.md
├── js/                         # Shared frontend scripts
│   ├── load_image_downsizer.js # Advanced Image Loader UI
│   ├── reference_loader.js
│   ├── mp_resolution.js
│   ├── note_list.js
│   └── image_compare.js
├── LoadImageDownsizer/         # Advanced Image Loader
├── ReferenceImageLoader/
├── MP_Resolution/
├── NoteList/
└── ImageCompare/
```

Future nodes: add a sibling package under `tallron/` and register it in the top-level `__init__.py`.
