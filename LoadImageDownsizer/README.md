# Advanced Image Loader (Tallron Handy Nodes)

Drop-in style replacement for ComfyUI’s built-in **Load Image** node, with interactive crop and a megapixel-budget resize output.

## Features

- **Standard load** — same file picker / upload as Load Image (`image_upload`)
- **Crop** — on-node **Crop** button opens a dialog; drag a box (or move an existing one); **Apply** saves the region to the workflow
- **Clear crop** — removes the crop so outputs use the full image again
- Crop is stored with the workflow and applied on execution (node preview stays the full image)
- **Megapixel downsize** — `image_downsized` scaled so W × H ≈ megapixels × 1 000 000 (aspect kept)
- `megapixels = 0` keeps the cropped (or full) resolution with no resize
- Selectable **upscale_method** (lanczos, nearest-exact, bilinear, area, bicubic)
- **Mask** output from alpha (`1 − alpha`); solid black when the source has no alpha
- Crop is applied to both image and mask before the optional megapixel resize

## Inputs

| Input | Type | Description |
|-------|------|-------------|
| `image` | combo / upload | Image from the ComfyUI input folder |
| `megapixels` | FLOAT | Target MP for `image_downsized` (0 = no resize) |
| `upscale_method` | combo | Interpolation used when resizing |
| `crop` | STRING (hidden) | Normalized crop box JSON written by the Crop dialog |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `image` | IMAGE | Loaded image after optional crop (full resolution of the crop) |
| `mask` | MASK | Alpha mask, cropped to match |
| `image_downsized` | IMAGE | Cropped image resized to the megapixel target |

## Category

**Tallron Handy Nodes** → **Advanced Image Loader**

## Usage

1. Add **Advanced Image Loader** from **Tallron Handy Nodes**
2. Select or upload an image
3. Optionally click **Crop**, draw a box, **Apply**
4. Set **megapixels** if you need a smaller second output
5. Wire `image`, `mask`, and/or `image_downsized`

## Notes

- After installing or updating, restart ComfyUI and hard-refresh the browser (Ctrl+F5)
- Older workflows that used the previous internal id `LoadImageDownsizer` should re-add this node
