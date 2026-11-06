# Reference Image Loader (Tallron)

Load up to **10 reference images** in a resizable 2-wide grid.

## Features

- `num_slots` (1–10) controls visible cells; node height auto-fits
- `index_style`:
  - **Qwen (1-based)** — cells/outputs labeled Image 1 … Image 10
  - **Flux (0-based)** — cells/outputs labeled Image 0 … Image 9
- Click or drag-drop per cell; live thumbnails; clear (×)
- Empty slots return **None** (no black images) so inference is not slowed
- Outputs: Image 1–10 (or 0–9 labels), `batch` (loaded only), full-size first image
- Shared megapixel resize + fit mode

## Category

**Tallron** → **Reference Image Loader**
