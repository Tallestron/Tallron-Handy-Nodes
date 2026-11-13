# Reference Image Loader (Tallron)

Load up to **10 reference images** in a resizable 2-wide grid.

## Features

- `num_slots` (1–10) controls visible cells; node height auto-fits
- `index_style`: Qwen (Image 1…) or Flux (Image 0…)
- Click or drag-drop per cell; live thumbnails; clear (×)
- **Reorder** — drag the ⠿ handle on a cell header onto another cell to swap images (crops move with them)
- **Crop on every slot** — compact **Crop** button over the top-left of each preview
- Empty slots return **None**
- Outputs: Image 1–10 (MP-resized), `full batch` (full-resolution images after crop, before resize — pure concatenate when sizes match, padded otherwise so they can be unbatched), full-size first image
- Shared megapixel resize + fit mode

## Category

**Tallron Handy Nodes** → **Reference Image Loader**
