# Image Compare (Tallron)

On-node viewer that compares two images side-by-side, as an overlay, or as a
pixel-difference map.

## Inputs

| Input   | Type  | Required | Description                                      |
|---------|-------|----------|--------------------------------------------------|
| image1  | IMAGE | no       | First image (e.g. before)                        |
| image2  | IMAGE | no       | Second image (e.g. after)                        |

Both inputs are optional. A muted or bypassed branch never raises a system error.

## View modes

- **Show 1 / Show 2** — full-size single image (click to toggle)
- **Left Right / Right Left** — hover to wipe horizontally
- **Up Down** — hover to wipe vertically
- **Overlay** — drag the opacity slider to fade between images
- **Difference** — highlights only the pixels that differ

In Show 1 / Show 2 you can **Save** (download) or **Copy** the current image.

## Category

`Tallron`
