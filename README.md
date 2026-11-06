# Tallron Handy Nodes

ComfyUI custom nodes under the **Tallron** category.

## Nodes

| Node | Description |
|------|-------------|
| **MP Resolution Selector** | On-node UI for width/height calibrated to megapixel targets |
| **Advanced Image Loader** | Load Image + interactive crop + megapixel-downsized output |
| **Reference Image Loader** | Up to 10 reference images in a 2-wide grid (Qwen 1-based or Flux 0-based labels, Image 1 crop) |
| **Note List** | Reorderable notes with expand/collapse, copy, and STRING output |
| **Image Compare** | Side-by-side / overlay / difference viewer (Nodes 2.0 compatible) |

## Install

### Manual

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Tallestrom/Tallron-Handy-Nodes.git
```

Restart ComfyUI, then hard-refresh the browser (Ctrl+F5).

### ComfyUI Manager

Install via Git URL:

`https://github.com/Tallestrom/Tallron-Handy-Nodes`

## Layout

```
Tallron-Handy-Nodes/
├── __init__.py
├── README.md
├── js/
├── MP_Resolution/
├── LoadImageDownsizer/
├── ReferenceImageLoader/
├── NoteList/
└── ImageCompare/
```

## License

Use freely in your workflows. Contributions welcome.
