# Load Image Downsizer (Tallron)

ComfyUI node that behaves like the built-in **Load Image** node, with:

1. **Crop** — open a dialog, drag a box; preview and outputs use that region  
2. **Megapixel downsize** — extra image output scaled to a target MP budget  

## Outputs

| Output | Description |
|--------|-------------|
| `image` | Loaded image after optional crop (full resolution of the crop) |
| `mask` | Alpha mask (`1 - alpha`), cropped to match. Black when source has no alpha |
| `image_downsized` | Cropped image resized so width × height ≈ megapixels × 1 000 000 |

## Inputs

- **image** – file picker / upload (same as Load Image)
- **megapixels** – target megapixels for the downsized output (`0` = no resize)
- **upscale_method** – interpolation used when resizing (`lanczos` recommended)
- **crop** (hidden) – normalized crop box JSON written by the Crop dialog

## Crop UI

1. Select / upload an image (standard Load Image controls).
2. Click **Crop** on the node.
3. In the dialog, drag on the image to draw a selection box.  
   Drag inside the box to move it. Pixel size is shown on the frame.
4. **Apply** — stores the crop, closes the dialog, and updates the node preview to the cropped region.  
   **Clear crop** — removes the crop (full image again).  
   **Cancel** / Escape — leave crop unchanged.

Crop is saved with the workflow. Changing the source image keeps the previous crop coords until you clear or re-crop.

## Category

**Tallron**

## Installation

Place the whole `tallron` folder in `ComfyUI/custom_nodes/`, restart, hard-refresh the browser (Ctrl+F5).
