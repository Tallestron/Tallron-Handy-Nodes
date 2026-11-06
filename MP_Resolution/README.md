# MP Resolution Selector (Tallron)

ComfyUI custom node — a model-profiled resolution picker, image passthrough,
optional width/height inputs, latent output, and a **Use Input Resolution** switch.

## Install

Copy the entire `tallron` folder into your ComfyUI `custom_nodes` directory:

```
ComfyUI/
  custom_nodes/
    tallron/
      MP_Resolution/
        __init__.py
        node_mp_resolution.py
        js/
          mp_resolution.js
        README.md
```

Restart ComfyUI. The node appears under **Tallron → MP Resolution Selector**.

## Inputs

| Name   | Type  | Notes |
|--------|-------|--------|
| latent_format | COMBO | Set automatically by the resolution profile: Krea 2 uses 16 channels at 8×, FLUX.2 uses 128 channels at 16×, and Qwen-Image 2.1 uses 64 channels at 16×. `standard` remains available for 4-channel, 8× models. |
| image  | IMAGE | Optional. Passed through to the image output. When *Use Input Resolution* is ON, its size drives the latent output. |
| width  | INT   | Optional. Passed directly to the width output when *Use Input Resolution* is ON. |
| height | INT   | Optional. Passed directly to the height output when *Use Input Resolution* is ON. |

## Outputs

| Name   | Type   | Notes |
|--------|--------|--------|
| image  | IMAGE  | Passthrough of the input image, or a blank image sized to the chosen resolution if none is connected. |
| width  | INT    | Width input when the switch is ON; otherwise the chosen width. |
| height | INT    | Height input when the switch is ON; otherwise the chosen height. |
| latent | LATENT | Empty latent matching the input image when the switch is ON; otherwise the chosen resolution, using the selected latent format. |

## Use Input Resolution switch

- **ON** — Image is passed through and its size drives the latent. Width and Height pass independently from their inputs to their outputs. The preset / custom picker is grayed out and ignored. Without an image, the latent uses the supplied dimensions (falling back to the picker for an unconnected axis).
- **OFF** — Size comes from the on-node presets, Custom Ratio, or Custom Resolution UI. Width and Height inputs are ignored. Image still passes through without forcing its own dimensions onto the outputs.

## Preset ratios

1:1, 16:9, 9:16, 2:1, 3:2, 2:3, 4:3, 3:4, 4:5. Available sizes depend on the selected model profile.

Custom Ratio and Custom Resolution modes support math expressions and snap steps (8 / 16 / 32 / 64).

## Resolution profiles

Choose a profile in the node before choosing an aspect ratio:

- **Krea 2** starts at 1024 × 1024 and includes 1K and 2K presets.
- **FLUX 3 Image Klein** includes 1K, 1.5K, 2K, 3K, and 4K presets.
- **Qwen-Image 2.1** uses its published native 2K buckets.

Changing the profile also selects its matching latent format.

State is saved with the workflow.

## Node sizing

The node height auto-sizes to the active resolution table: Krea 2 (2 rows) is shorter than FLUX 3 Image Klein (5 rows). Switching profile or ratio recalculates the height; custom modes use a fixed panel height.
