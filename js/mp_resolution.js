import { app } from "/scripts/app.js";

console.log("[Tallron] MP Resolution Selector JS loaded");

// --- Minimal self-contained stubs (no Pixaroma shared dependency) ---
function hideJsonWidget(widgets, name) {
  if (!widgets) return;
  for (const w of widgets) {
    if (w?.name === name) {
      w.computeSize = () => [0, -4];
      w.draw = () => {};
      w.type = "hidden";
    }
  }
}

function applyAdaptiveCanvasOnly(widget) {
  // No-op for Nodes 2.0 / legacy compatibility; widget still works.
  if (widget) widget.canvasOnly = false;
}

function installCanvasZoomPassthrough(el) {
  if (!el) return;
  el.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
}

function installNodeAccent(node, root) {
  // Apply light-blue accent via CSS variable on the root element.
  if (root) root.style.setProperty("--pix-acc", "#5BA3F5");
}

function registerNodeAccent(_className, _opts) {
  // Colour-picker integration is optional; no-op when shared branding is absent.
}

// Inline SVG data-URIs so we don't need pixAsset / external icon files.
const ICON_SWAP = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M16%203h5v5M8%2021H3v-5M21%203l-7%207M3%2021l7-7%22/%3E%3C/svg%3E";
const ICON_MAGNET = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%2015V6a4%204%200%200%201%208%200v9%22/%3E%3Cpath%20d%3D%22M6%2015a4%204%200%200%200%208%200%22/%3E%3Cpath%20d%3D%22M10%206v9%22/%3E%3C/svg%3E";

function pixAsset(path) {
  if (path && path.includes("swap")) return ICON_SWAP;
  if (path && path.includes("magnet")) return ICON_MAGNET;
  return "";
}
// --- end stubs ---


function injectCSS() {
  if (document.getElementById("tallron-mp-resolution-css")) return;
  const css = `
    .pix-res-root {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 4px;
      color: #ddd;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: hidden;
    }
    /* 6-col grid lets us mix 1/3-width ratio chips (span 2) with 1/2-width
       custom chips (span 3) on the same row. */
    .pix-res-chips {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 5px;
    }
    .pix-res-chip {
      grid-column: span 2; /* default = 1/3 width (3 chips per row) */
      background: #1d1d1d;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 6px 4px;
      font-size: 10px;
      color: #ccc;
      cursor: pointer;
      user-select: none;
      transition: background 0.08s, border-color 0.08s;
      /* flex layout so a small visual AR rectangle can sit next to the label
         on ratio chips. Custom Ratio / Custom Resolution chips skip the shape
         and just render the label, which centers naturally via justify-content. */
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .pix-res-chip:hover { border-color: #666; }
    .pix-res-chip.active {
      background: var(--pix-acc,#5BA3F5);
      color: #fff;
      border-color: var(--pix-acc,#5BA3F5);
    }
    .pix-res-chip.span-half { grid-column: span 3; } /* 1/2 width — used by Custom Ratio + Custom Resolution */
    /* Tiny ratio-shape preview rendered inside each ratio chip. Width and
       height are set inline by JS to match the actual W:H, so the user can
       recognize the shape of every preset at a glance, not just the picked one.
       Bounding box (14 x 11) is tuned for the ~66 px ratio chip width — leaves
       enough room next to the label "16:9" without clipping at NODE_W = 240. */
    .pix-res-chip-shape {
      display: inline-block;
      background: rgba(180, 180, 180, 0.25);
      border: 1px solid #888;
      border-radius: 1px;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .pix-res-chip.active .pix-res-chip-shape {
      background: rgba(255, 255, 255, 0.4);
      border-color: rgba(255, 255, 255, 0.85);
    }
    .pix-res-list {
      background: #1d1d1d;
      border: 1px solid #444;
      border-radius: 4px;
      /* x clipped (active-row orange tint stays inside rounded border);
         y scrolls if at large browser zoom the rows still wouldn't fit
         (node height is locked, so this is a defensive fallback only). */
      overflow-x: hidden;
      overflow-y: auto;
      /* Preset list takes its natural size (8 fixed-height rows + borders);
         since the widget is sized to exactly accommodate that, no extra space
         appears in either direction. Custom panel overrides to flex:1 so its
         preview rect can absorb the panel's vertical space. */
      flex: 0 1 auto;
      display: flex;
      flex-direction: column;
    }
    .pix-res-list.pix-res-custom {
      flex: 1;
      min-height: 160px;
    }
    /* Slim, theme-matched scrollbar so the list doesn't get a fat default bar. */
    .pix-res-list::-webkit-scrollbar { width: 6px; }
    .pix-res-list::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
    .pix-res-list::-webkit-scrollbar-track { background: transparent; }
    /* Subtle focus indicator: brand-tinted border (no outline ring overflow). */
    .pix-res-list:focus { outline: none; border-color: var(--pix-acc,#5BA3F5); }
    .pix-res-row {
      /* Fixed row height — must NOT grow with the node, otherwise resizing
         taller bloats every row to a giant cell. flex-shrink: 0 + the parent
         list's overflow-y: auto means rows stay readable and the list scrolls
         instead when the widget is too short to fit all 8. */
      flex: 0 0 28px;
      box-sizing: border-box;
      padding: 4px 8px;
      border-bottom: 1px solid #2f2f2f;
      font-size: 11px;
      text-align: center;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      color: #ccc;
    }
    .pix-res-row:last-child { border-bottom: none; }
    .pix-res-row.active {
      background: color-mix(in srgb, var(--pix-acc,#5BA3F5) 15%, transparent);
      color: var(--pix-acc,#5BA3F5);
      font-weight: 600;
    }
    .pix-res-row.empty {
      cursor: default;
      color: #2a2a2a;
    }
    .pix-res-custom {
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pix-res-custom-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 6px;
      align-items: end; /* push the swap icon down so it sits next to the input boxes, not the labels */
    }
    .pix-res-custom-field { display: flex; flex-direction: column; gap: 3px; }
    .pix-res-custom-field label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .pix-res-custom-field input {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 2px 6px;
      color: var(--pix-acc,#5BA3F5);
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      font-family: inherit;
      box-sizing: border-box;
      width: 100%;
    }
    .pix-res-custom-field input:focus {
      outline: none;
      border-color: var(--pix-acc,#5BA3F5);
    }
    /* Square icon button placed BETWEEN the W and H inputs (Figma/Photoshop pattern).
       Uses CSS mask-image so the SVG inherits color via the button's color property
       — same technique Note Pixaroma uses for toolbar mask-icons. */
    .pix-res-swap {
      width: 26px;
      height: 22px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #aaa;
      cursor: pointer;
      padding: 0;
      position: relative;
      display: inline-block;
    }
    .pix-res-swap::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: currentColor;
      -webkit-mask: url("${pixAsset("icons/ui/swap.svg")}") center / 12px 12px no-repeat;
              mask: url("${pixAsset("icons/ui/swap.svg")}") center / 12px 12px no-repeat;
      pointer-events: none;
    }
    .pix-res-swap:hover { color: var(--pix-acc,#5BA3F5); border-color: var(--pix-acc,#5BA3F5); }
    .pix-res-readout {
      display: flex;
      align-items: center;
      /* snap-group pinned left, ratio/MP pinned right — text length changes
         on the right side then can't push the snap chips around. */
      justify-content: space-between;
      gap: 6px;
      padding: 0 2px;
      font-size: 10px;
      color: #777;
    }
    .pix-res-readout .accent { color: var(--pix-acc,#5BA3F5); }
    /* Aspect-ratio visual preview — fills the remaining custom-panel space.
       The inner rect is scaled to the chosen W:H ratio so the user sees the
       shape they'll get at a glance. Label below shows the exact W × H. */
    .pix-res-preview {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding-top: 4px;
      min-height: 0;
    }
    .pix-res-preview-rect {
      background: color-mix(in srgb, var(--pix-acc,#5BA3F5) 18%, transparent);
      border: 1px solid var(--pix-acc,#5BA3F5);
      border-radius: 2px;
      transition: width 0.15s ease, height 0.15s ease;
    }
    .pix-res-preview-label {
      font-family: inherit;
      font-size: 10px;
      color: #999;
    }
    .pix-res-preview-label .accent { color: var(--pix-acc,#5BA3F5); }
    /* Snap-step picker — magnet label + 4 small chip buttons (8/16/32/64). */
    .pix-res-snap-group {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .pix-res-snap-icon {
      display: inline-block;
      width: 11px;
      height: 11px;
      background-color: #888;
      -webkit-mask: url("${pixAsset("icons/ui/magnet.svg")}") center / 11px 11px no-repeat;
              mask: url("${pixAsset("icons/ui/magnet.svg")}") center / 11px 11px no-repeat;
      pointer-events: none;
    }
    .pix-res-snap-btns {
      display: inline-flex;
      gap: 2px;
    }
    .pix-res-snap-btn {
      background: #1d1d1d;
      border: 1px solid #444;
      border-radius: 3px;
      color: #aaa;
      font-size: 9px;
      padding: 2px 5px;
      min-width: 18px;
      cursor: pointer;
      font-family: inherit;
      line-height: 1;
    }
    .pix-res-snap-btn:hover { color: #ddd; border-color: #666; }
    .pix-res-snap-btn.active {
      background: var(--pix-acc,#5BA3F5);
      color: #fff;
      border-color: var(--pix-acc,#5BA3F5);
    }

    /* Custom Ratio panel — Photoshop "lock-aspect" pattern. Sections top to
       bottom: (1) ratio inputs (W:H typed once), (2) quick-pick width chips
       (S/M/L/XL), (3) W and H math-aware inputs side-by-side (edit either,
       counterpart auto-computes from ratio), (4) aspect preview, (5) footer
       (snap picker + ratio·MP). Reuses .pix-res-custom-* layout for fields —
       the wrap element gets both classes so it inherits the custom-mode shell
       (padding, gap, flex column) without needing a duplicate rule here. */
    .pix-res-ratio-input-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .pix-res-ratio-input-row .pix-res-ratio-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pix-res-ratio-input-row input {
      width: 42px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 3px;
      padding: 2px 6px;
      color: var(--pix-acc,#5BA3F5);
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      font-family: inherit;
      box-sizing: border-box;
    }
    .pix-res-ratio-input-row input:focus { outline: none; border-color: var(--pix-acc,#5BA3F5); }
    .pix-res-ratio-swap {
      width: 22px;
      height: 22px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 3px;
      color: #aaa;
      cursor: pointer;
      position: relative;
      padding: 0;
      display: inline-block;
    }
    .pix-res-ratio-swap::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: currentColor;
      -webkit-mask: url("${pixAsset("icons/ui/swap.svg")}") center / 12px 12px no-repeat;
              mask: url("${pixAsset("icons/ui/swap.svg")}") center / 12px 12px no-repeat;
      pointer-events: none;
    }
    .pix-res-ratio-swap:hover { color: var(--pix-acc,#5BA3F5); border-color: var(--pix-acc,#5BA3F5); }
    /* Quick-pick width chips — 4 evenly-spaced buttons under the ratio row. */
    .pix-res-quickpicks {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }
    .pix-res-quickpick {
      background: #1d1d1d;
      border: 1px solid #444;
      border-radius: 3px;
      color: #ccc;
      padding: 5px 0;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.08s, border-color 0.08s;
    }
    .pix-res-quickpick:hover { border-color: #666; color: #fff; }
    .pix-res-quickpick.active {
      background: var(--pix-acc,#5BA3F5);
      color: #fff;
      border-color: var(--pix-acc,#5BA3F5);
    }

    /* ── Use Input Resolution switch ─────────────────────────────── */
    .pix-res-switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 2px 2px;
      user-select: none;
    }
    .pix-res-switch-label {
      font-size: 10px;
      color: #aaa;
      letter-spacing: 0.2px;
      flex: 1;
      line-height: 1.3;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .pix-res-switch-label strong {
      color: #ddd;
      font-weight: 600;
      font-size: 11px;
    }
    .pix-res-switch-label .pix-res-switch-sub {
      font-size: 9px;
      color: #888;
      font-weight: 400;
    }
    .pix-res-switch-label .accent {
      color: var(--pix-acc,#5BA3F5);
    }
    .pix-res-profile {
      width: 100%; height: 26px; margin-bottom: 7px; padding: 0 7px;
      color: var(--input-text,#ddd); background: var(--comfy-input-bg,#222);
      border: 1px solid var(--border-color,#454545); border-radius: 4px;
      font: inherit; font-size: 11px;
    }
    .pix-res-scale-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 2px 2px 4px;
    }
    .pix-res-scale-label {
      font-size: 10px;
      color: #ddd;
      font-weight: 600;
      flex-shrink: 0;
    }
    .pix-res-scale-select {
      flex: 1;
      min-width: 0;
      height: 24px;
      padding: 0 6px;
      color: var(--input-text,#ddd);
      background: var(--comfy-input-bg,#222);
      border: 1px solid var(--border-color,#454545);
      border-radius: 4px;
      font: inherit;
      font-size: 11px;
    }
    .pix-res-scale-select:focus {
      outline: none;
      border-color: var(--pix-acc,#5BA3F5);
    }
    .pix-res-toggle {
      position: relative;
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: #444;
      border: 1px solid #555;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, border-color 0.15s;
      padding: 0;
    }
    .pix-res-toggle.on {
      background: var(--pix-acc,#5BA3F5);
      border-color: var(--pix-acc,#5BA3F5);
    }
    .pix-res-toggle::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #eee;
      transition: transform 0.15s;
    }
    .pix-res-toggle.on::after {
      transform: translateX(16px);
    }
    /* Picker body under the switch — fills remaining height */
    .pix-res-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }
    /* Gray-out the entire picker body when Use Input is ON */
    .pix-res-body.disabled {
      opacity: 0.38;
      pointer-events: none;
      filter: grayscale(0.35);
    }
    /* Scale dropdown grayed when Use Input is OFF (only applies to image input) */
    .pix-res-scale-row.disabled {
      opacity: 0.38;
      pointer-events: none;
      filter: grayscale(0.35);
    }
    .pix-res-scale-row.disabled .pix-res-scale-select {
      cursor: not-allowed;
    }
  `;
  const style = document.createElement("style");
  style.id = "tallron-mp-resolution-css";
  style.textContent = css;
  document.head.appendChild(style);
}
injectCSS();

// Node dimensions are LOCKED — width and height. The original "make it
// resizable" attempt was a workaround for the default height being too small
// to show all 8 preset rows; once that's fixed, there's no real reason to
// resize, and a resizable node just produces an awkward dark empty band when
// dragged taller. Locking matches the canvas-side res-node pattern and is
// honest: the node draws exactly what fits its content.
//
// NODE_H sized so all 8 preset rows fit at 100% browser zoom with NO
// scrollbar — exact content breakdown (in pixels of widget area):
//   root padding (8 top + 8 bottom) ............... 16
//   chip grid (4 rows × 26 + 3 × 5 gap) ............ 119
//     ├─ row 1: 1:1 / 16:9 / 9:16
//     ├─ row 2: 2:1 / 3:2 / 2:3
//     ├─ row 3: 4:3 / 3:4 / 4:5
//     └─ row 4: Custom Ratio / Custom Resolution (half-width chips)
//   gap between chips and list ..................... 8
//   size list ..................................... 233
//     ├─ borders (1 top + 1 bottom) ........  2
//     ├─ rows (8 × 28 fixed-height) ....... 224
//     └─ inter-row borders (7 × 1) .........  7
//   DOM widget `margin: 4` (top + bottom) ........... 8
//                                                  ----
//   widget content total ......................... 384
//   chrome (titlebar + port row + frame margins) ... 46
//                                                  ----
//   NODE_H ....................................... 430
//
// 435 chosen with a 5-px safety margin for sub-pixel rounding, font metric
// variance across browsers, and the focus-state border swap.
const NODE_W = 260;
// Chrome budget (title + I/O ports for image/w/h + image/w/h/latent).
const CHROME_H = 120;
// Fixed vertical pieces above the size list (padding, switch, profile, chips).
const FIXED_UI_H =
  16 +  // root padding top+bottom
  40 +  // Use Input switch row (title + sub-line)
  40 +  // Scale input image row (label + select)
  33 +  // profile <select> + margin
  119 + // chip grid (4 rows)
  8;    // gap chips → list
const ROW_H = 28; // .pix-res-row fixed height
const CUSTOM_PANEL_H = 220; // custom / custom_ratio panel natural height
const MIN_NODE_H = 360;
const MAX_NODE_H = 720;

/** Number of resolution rows for the current profile + ratio (preset mode). */
function presetRowCount(state) {
  if (state.mode !== "preset") return 0;
  const profile = getResolutionProfile(state);
  const sizes = profile.sizes[state.ratio] || [];
  return Math.max(1, sizes.length);
}

/** Widget area height that fits the current UI (list or custom panel). */
function computeWidgetH(state) {
  if (state.mode === "custom" || state.mode === "custom_ratio") {
    return FIXED_UI_H + CUSTOM_PANEL_H;
  }
  const n = presetRowCount(state);
  // list borders (2) + inter-row borders (n-1) + n rows
  const listH = 2 + Math.max(0, n - 1) + n * ROW_H;
  return FIXED_UI_H + listH;
}

/** Full node height = chrome + widget. */
function computeNodeH(state) {
  const h = CHROME_H + computeWidgetH(state);
  return Math.max(MIN_NODE_H, Math.min(MAX_NODE_H, h));
}

/** Apply computed size to the LiteGraph node and its DOM widget. */
function applyNodeSize(node, state) {
  const st = state || readState(node);
  const nodeH = computeNodeH(st);
  const widgetH = computeWidgetH(st);
  node.size = [NODE_W, nodeH];
  if (typeof node.setSize === "function") node.setSize([NODE_W, nodeH]);
  // Keep the DOM widget callbacks in sync if the widget already exists.
  const w = (node.widgets || []).find((x) => x.name === "resolution_ui");
  if (w) {
    w.computedHeight = widgetH;
    if (typeof w.getMinHeight === "function" || w.options) {
      // LiteGraph reads these each layout pass.
      w.getMinHeight = () => widgetH;
      w.getMaxHeight = () => widgetH;
    }
  }
  return { nodeH, widgetH };
}

// Python uses `hidden` inputs (no widget, no slot dot). State lives on
// node.properties[STATE_PROP] which LiteGraph serializes natively in the
// workflow JSON. The JS-side hook (app.graphToPrompt) injects the state
// into the API prompt as the `ResolutionState` hidden input at run time.
const STATE_PROP = "resolutionState";
const HIDDEN_INPUT_NAME = "ResolutionState"; // matches Python INPUT_TYPES key

const DEFAULT_STATE = {
  mode: "preset", // "preset" | "custom" | "custom_ratio"
  ratio: "1:1",
  w: 1024,
  h: 1024,
  custom_w: 1024,
  custom_h: 1024,
  // Custom Ratio mode — user types a ratio (e.g. 4:3) and picks from
  // generated sizes. Defaults to a popular non-preset ratio so the panel
  // shows useful sizes the moment the user clicks the chip.
  custom_ratio_w: 4,
  custom_ratio_h: 3,
  snap: 16, // px step for Custom mode commit + arrow-key nudge (8 / 16 / 32 / 64)
  use_input: false, // true = incoming input size; picker grayed out
  scale_mode: "keep", // "keep" | "2k" | "3k" | "4k" — total pixel area ≈ N²
  profile: "krea2",
};

const SNAP_OPTIONS = [8, 16, 32, 64];

function findStateWidget(node) {
  return (node.widgets || []).find(
    (x) => x && (x.name === HIDDEN_INPUT_NAME || x.name === "ResolutionState")
  );
}

/** Normalize migrated keys (fit_2k → scale_mode) after parsing. */
function normalizeState(raw) {
  const s = { ...DEFAULT_STATE, ...raw };
  if (!s.scale_mode || s.scale_mode === "keep") {
    if (s.fit_2k) s.scale_mode = "2k";
  }
  if (!["keep", "2k", "3k", "4k"].includes(s.scale_mode)) s.scale_mode = "keep";
  delete s.fit_2k;
  return s;
}

function readState(node) {
  // 1) Live widget value (this is what ComfyUI puts into the API prompt)
  const widget = findStateWidget(node);
  if (widget && typeof widget.value === "string" && widget.value) {
    try {
      return normalizeState(JSON.parse(widget.value));
    } catch { /* fall through */ }
  }
  // 2) node.properties (backup / older saves)
  const v = node.properties?.[STATE_PROP];
  if (typeof v === "string" && v) {
    try { return normalizeState(JSON.parse(v)); }
    catch { /* fall through */ }
  }
  // 3) widgets_values migration
  const wv = node.widgets_values;
  if (Array.isArray(wv)) {
    for (const x of wv) {
      if (typeof x === "string" && x.includes('"mode"')) {
        try {
          const parsed = JSON.parse(x);
          if (parsed && typeof parsed === "object" && "ratio" in parsed) {
            const normalized = normalizeState(parsed);
            writeState(node, normalized);
            return normalized;
          }
        } catch { /* keep looking */ }
      }
    }
  }
  return { ...DEFAULT_STATE };
}

function writeState(node, state) {
  const json = JSON.stringify(state);
  if (!node.properties) node.properties = {};
  node.properties[STATE_PROP] = json;
  // Keep the STRING widget in sync — this is what gets serialized into the
  // execution prompt. Without this, use_input / w / h never reach Python.
  const widget = findStateWidget(node);
  if (widget) widget.value = json;
}

// Chip layout — order matches design spec
const CHIPS = [
  { id: "1:1",    label: "1:1" },
  { id: "16:9",   label: "16:9" },
  { id: "9:16",   label: "9:16" },
  { id: "2:1",    label: "2:1" },
  { id: "3:2",    label: "3:2" },
  { id: "2:3",    label: "2:3" },
  { id: "4:3",    label: "4:3" },
  { id: "3:4",    label: "3:4" },
  { id: "4:5",    label: "4:5" },
  { id: "custom_ratio", label: "Custom Ratio", spanHalf: true },
  { id: "custom",       label: "Custom Resolution", spanHalf: true },
];

const RESOLUTION_PROFILES = {
  krea2: {
    label: "Krea 2 · 1K–2K",
    latentFormat: "krea2",
    labels: ["1K", "2K"],
    sizes: {
      "1:1": [[1024,1024],[2048,2048]], "16:9": [[1024,576],[2048,1152]], "9:16": [[576,1024],[1152,2048]],
      "2:1": [[1024,512],[2048,1024]], "3:2": [[1024,688],[2048,1360]], "2:3": [[688,1024],[1360,2048]],
      "4:3": [[1024,768],[2048,1536]], "3:4": [[768,1024],[1536,2048]], "4:5": [[816,1024],[1632,2048]],
    },
  },
  flux3_image_klein: {
    label: "FLUX 3 Image Klein · 1K–4K",
    latentFormat: "flux3",
    labels: ["1K", "1.5K", "2K", "3K", "4K"],
    sizes: {
      "1:1": [[1024,1024],[1536,1536],[2048,2048],[3072,3072],[4096,4096]],
      "16:9": [[1024,576],[1536,864],[2048,1152],[3072,1728],[4096,2304]],
      "9:16": [[576,1024],[864,1536],[1152,2048],[1728,3072],[2304,4096]],
      "2:1": [[1024,512],[1536,768],[2048,1024],[3072,1536],[4096,2048]],
      "3:2": [[1024,688],[1536,1024],[2048,1360],[3072,2048],[4096,2736]],
      "2:3": [[688,1024],[1024,1536],[1360,2048],[2048,3072],[2736,4096]],
      "4:3": [[1024,768],[1536,1152],[2048,1536],[3072,2304],[4096,3072]],
      "3:4": [[768,1024],[1152,1536],[1536,2048],[2304,3072],[3072,4096]],
      "4:5": [[816,1024],[1232,1536],[1632,2048],[2464,3072],[3280,4096]],
    },
  },
  qwen_image_21: {
    label: "Qwen-Image 2.1 · native 2K",
    latentFormat: "qwen_image_21",
    labels: ["2K native"],
    sizes: {
      "1:1": [[2048,2048]], "16:9": [[2752,1536]], "9:16": [[1536,2752]],
      "3:2": [[2528,1696]], "2:3": [[1696,2528]], "4:3": [[2400,1792]], "3:4": [[1792,2400]],
    },
  },
};

function getProfileId(state) {
  return state.profile === "flux2_klein" ? "flux3_image_klein" : state.profile;
}

function getResolutionProfile(state) {
  return RESOLUTION_PROFILES[getProfileId(state)] || RESOLUTION_PROFILES.krea2;
}

/** Last entry in a preset size list = highest resolution. */
function highestPreset(sizes) {
  if (!sizes || !sizes.length) return [1024, 1024];
  return sizes[sizes.length - 1];
}


function setLatentFormat(node, latentFormat) {
  const widget = (node.widgets || []).find((x) => x.name === "latent_format");
  if (!widget || widget.value === latentFormat) return;
  widget.value = latentFormat;
  widget.callback?.(latentFormat);
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1;
}

function ratioLabel(w, h) {
  const g = gcd(w, h);
  const rw = w / g, rh = h / g;
  const known = ["1:1","16:9","9:16","2:1","1:2","3:2","2:3","4:3","3:4","4:5","5:4"];
  const simple = `${rw}:${rh}`;
  if (known.includes(simple)) return simple;
  const r = w / h;
  return r >= 1 ? `~${r.toFixed(2)}:1` : `~1:${(1 / r).toFixed(2)}`;
}

function megapixels(w, h) {
  return ((w * h) / 1_000_000).toFixed(2);
}

function snapTo(n, step) { return Math.round(n / step) * step; }
function clampDim(n) { return Math.max(256, Math.min(4096, n)); }

// Return v if it's a finite positive integer, otherwise fallback. Used for
// `custom_ratio_w` / `custom_ratio_h` reads — a corrupted/malicious workflow
// JSON could supply a string ("0", "<img...>"), 0, or a negative number, all
// of which slip past `?? 4` (nullish only). Coercing here closes both the
// XSS vector (string into innerHTML) and the divide-by-zero / negative path.
function safePositiveInt(v, fallback) {
  const n = +v;
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Quick-pick width values for Custom Ratio mode — common AI-friendly widths.
// 512 (low-VRAM/draft), 768 (SD1.5 native), 1024 (SDXL native), 1536 (high-res).
// Click sets W to this value; H auto-computes from the typed ratio + snap.
const QUICK_PICK_WIDTHS = [512, 768, 1024, 1536];

// Tiny safe math evaluator for the W/H inputs — supports `+ - * / ( )` and
// decimals only. Hand-rolled recursive descent. NEVER use eval() / Function()
// here: even though the field is per-node, accepting arbitrary JS would let a
// shared workflow execute code on import. Returns NaN for any invalid input.
// Examples: "1024", "1024+128", "512*2", "(1024+128)/2", "1024 + 128".
function safeMathEval(str) {
  if (typeof str !== "string") return NaN;
  const s = str.trim();
  if (!s) return NaN;
  // Whitelist all chars up front so the parser never sees a stray identifier.
  if (!/^[0-9+\-*/().\s]+$/.test(s)) return NaN;
  // Hard length cap — defends against pathological inputs reaching the parser.
  if (s.length > 256) return NaN;

  let pos = 0;
  // Recursion depth cap — prevents stack overflow from deeply-nested parens
  // like "((((...1...))))". Threshold 64 is well above any realistic
  // expression and safely below browser stack limits.
  const MAX_DEPTH = 64;
  let depth = 0;
  const skipWs = () => { while (pos < s.length && s[pos] === " ") pos++; };
  const eat = (ch) => { skipWs(); if (s[pos] === ch) { pos++; return true; } return false; };

  function parseExpr() {
    let v = parseTerm();
    for (;;) {
      skipWs();
      if (eat("+")) v += parseTerm();
      else if (eat("-")) v -= parseTerm();
      else break;
    }
    return v;
  }
  function parseTerm() {
    let v = parseFactor();
    for (;;) {
      skipWs();
      if (eat("*")) v *= parseFactor();
      else if (eat("/")) {
        const d = parseFactor();
        if (d === 0) return NaN;
        v /= d;
      } else break;
    }
    return v;
  }
  function parseFactor() {
    if (++depth > MAX_DEPTH) return NaN;
    skipWs();
    if (eat("+"))  { const r = parseFactor(); depth--; return r; }
    if (eat("-"))  { const r = -parseFactor(); depth--; return r; }
    if (eat("(")) {
      const v = parseExpr();
      if (!eat(")")) { depth--; return NaN; }
      depth--;
      return v;
    }
    let num = "";
    while (pos < s.length && /[0-9.]/.test(s[pos])) num += s[pos++];
    depth--;
    if (!num) return NaN;
    // Reject malformed numbers like "1.2.3" — parseFloat would silently
    // truncate to 1.2 and the trailing-garbage check below wouldn't catch it.
    if ((num.match(/\./g) || []).length > 1) return NaN;
    return parseFloat(num);
  }

  const v = parseExpr();
  skipWs();
  if (pos !== s.length) return NaN; // trailing garbage
  return v;
}

// Parse a chip id like "16:9" into [16, 9]. Returns null for "custom" /
// "custom_ratio" so the shape-render path skips them.
function parseRatioId(id) {
  const m = /^(\d+):(\d+)$/.exec(id);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

// Scale a W:H pair to fit inside maxW × maxH, preserving aspect. Returns
// rounded integer px so the rendered rectangle has crisp 1 px borders.
function fitRectToBox(rw, rh, maxW, maxH) {
  const aspect = rw / rh;
  let w, h;
  if (aspect >= maxW / maxH) { w = maxW; h = maxW / aspect; }
  else                       { h = maxH; w = maxH * aspect; }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

// Bounding box for the in-chip ratio rectangle. 14 × 11 fits comfortably next
// to the longest label ("16:9", ~24 px) inside the ~66 px ratio chip.
const CHIP_SHAPE_MAX_W = 14;
const CHIP_SHAPE_MAX_H = 11;

function renderChipGrid(state) {
  const wrap = document.createElement("div");
  wrap.className = "pix-res-chips";
  for (const c of CHIPS) {
    const el = document.createElement("div");
    el.className = "pix-res-chip" + (c.spanHalf ? " span-half" : "");
    el.dataset.chipId = c.id;
    const isActive =
      (c.id === "custom" && state.mode === "custom") ||
      (c.id === "custom_ratio" && state.mode === "custom_ratio") ||
      (c.id !== "custom" && c.id !== "custom_ratio" &&
       state.mode === "preset" && state.ratio === c.id);
    if (isActive) el.classList.add("active");

    // Visual AR rectangle for ratio chips only; custom chips stay text-only
    // because they're half-width (more horizontal space for the longer label)
    // and don't have a fixed shape to preview here.
    const ratio = parseRatioId(c.id);
    if (ratio) {
      const shape = document.createElement("span");
      shape.className = "pix-res-chip-shape";
      const { w, h } = fitRectToBox(ratio[0], ratio[1], CHIP_SHAPE_MAX_W, CHIP_SHAPE_MAX_H);
      shape.style.width = `${w}px`;
      shape.style.height = `${h}px`;
      el.appendChild(shape);
    }

    const labelEl = document.createElement("span");
    labelEl.textContent = c.label;
    el.appendChild(labelEl);

    wrap.appendChild(el);
  }
  return wrap;
}

function renderProfileSelect(node, state) {
  const select = document.createElement("select");
  select.className = "pix-res-profile";
  select.title = "Choose the model whose native resolution presets you want to use.";
  for (const [id, profile] of Object.entries(RESOLUTION_PROFILES)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = profile.label;
    option.selected = getProfileId(state) === id;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    const profile = RESOLUTION_PROFILES[select.value];
    const current = readState(node);
    const ratio = profile.sizes[current.ratio] ? current.ratio : "1:1";
    const sizes = profile.sizes[ratio];
    const [w, h] = highestPreset(sizes);
    setLatentFormat(node, profile.latentFormat);
    writeState(node, { ...current, profile: select.value, ratio, w, h });
    renderUI(node);
  });
  return select;
}

function renderSizeList(state) {
  const wrap = document.createElement("div");
  wrap.className = "pix-res-list";
  // Make the list focusable so ArrowUp/Down/Home/End change the active row.
  // Custom mode renders its own .pix-res-list (with .pix-res-custom) and
  // doesn't need this — its W/H inputs own keyboard input.
  wrap.tabIndex = 0;
  if (state.mode !== "preset") return wrap;
  const profile = getResolutionProfile(state);
  const sizes = profile.sizes[state.ratio] || [];
  // Only real rows — node height is auto-sized to this table (no empty pads).
  for (let i = 0; i < sizes.length; i++) {
    const row = document.createElement("div");
    row.className = "pix-res-row";
    const [w, h] = sizes[i];
    row.textContent = `${w} × ${h}  ·  ${profile.labels[i] || ""}`;
    row.dataset.w = String(w);
    row.dataset.h = String(h);
    if (state.w === w && state.h === h) row.classList.add("active");
    wrap.appendChild(row);
  }
  return wrap;
}

function renderCustomPanel(node, state) {
  const wrap = document.createElement("div");
  wrap.className = "pix-res-list pix-res-custom";

  const row = document.createElement("div");
  row.className = "pix-res-custom-row";

  // Inputs are `type="text"` (not `number`) so users can type math expressions
  // like `1024+128` or `512*2`. We evaluate via safeMathEval on commit and on
  // ArrowUp/Down (custom snap-stepping). `inputmode="decimal"` keeps mobile
  // keypads numeric; the visible spinner buttons are gone but Up/Down arrows
  // step by snap (replacing the native HTML5 number-input stepper).
  const wField = document.createElement("div");
  wField.className = "pix-res-custom-field";
  const wLabel = document.createElement("label");
  wLabel.textContent = "Width";
  const wInput = document.createElement("input");
  wInput.type = "text";
  wInput.inputMode = "decimal";
  wInput.spellcheck = false;
  wInput.autocomplete = "off";
  wInput.title = "Math allowed: 1024+128, 512*2, (1024+128)/2";
  wInput.value = String(state.w);

  const hField = document.createElement("div");
  hField.className = "pix-res-custom-field";
  const hLabel = document.createElement("label");
  hLabel.textContent = "Height";
  const hInput = document.createElement("input");
  hInput.type = "text";
  hInput.inputMode = "decimal";
  hInput.spellcheck = false;
  hInput.autocomplete = "off";
  hInput.title = "Math allowed: 1024+128, 512*2, (1024+128)/2";
  hInput.value = String(state.h);

  wField.append(wLabel, wInput);
  hField.append(hLabel, hInput);

  const swap = document.createElement("button");
  swap.type = "button";
  swap.className = "pix-res-swap";
  swap.title = "Swap Width ↔ Height";
  swap.setAttribute("aria-label", "Swap Width and Height");

  // Place the swap icon BETWEEN the two input fields (Figma/Photoshop pattern).
  row.append(wField, swap, hField);

  const readout = document.createElement("div");
  readout.className = "pix-res-readout";

  // Snap-step picker: magnet icon + 4 small chip buttons (8/16/32/64).
  // Click to set; the active value is highlighted in brand orange.
  const snapGroup = document.createElement("div");
  snapGroup.className = "pix-res-snap-group";
  snapGroup.title = "Snap step (also drives Up/Down arrow nudge)";
  const snapIcon = document.createElement("span");
  snapIcon.className = "pix-res-snap-icon";
  const snapBtns = document.createElement("div");
  snapBtns.className = "pix-res-snap-btns";
  const snapBtnEls = [];
  for (const v of SNAP_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pix-res-snap-btn" + (v === (state.snap || 16) ? " active" : "");
    btn.textContent = String(v);
    btn.dataset.v = String(v);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      applySnap(v);
    });
    snapBtns.appendChild(btn);
    snapBtnEls.push(btn);
  }
  snapGroup.append(snapIcon, snapBtns);

  function applySnap(v) {
    for (const b of snapBtnEls) {
      b.classList.toggle("active", parseInt(b.dataset.v, 10) === v);
    }
    // Inputs are type="text" now (math support); no native step attr to update.
    // Arrow-key stepping reads the snap value at keypress time, so this just
    // needs to land in state and re-commit so the W/H snap to the new step.
    const cur = readState(node);
    writeState(node, { ...cur, snap: v });
    commit();
  }

  const ratioMP = document.createElement("span");

  readout.append(snapGroup, ratioMP);

  // Aspect-ratio visual preview — orange-tinted rectangle scaled to the
  // chosen W:H, with the exact W × H labeled below it.
  const preview = document.createElement("div");
  preview.className = "pix-res-preview";
  const previewRect = document.createElement("div");
  previewRect.className = "pix-res-preview-rect";
  const previewLabel = document.createElement("div");
  previewLabel.className = "pix-res-preview-label";
  preview.append(previewRect, previewLabel);

  // Maximum bounding box for the rectangle. Tuned so a 1:1 fits comfortably
  // inside the empty space below the readout in the locked node.
  const PREVIEW_MAX_W = 90;
  const PREVIEW_MAX_H = 60;

  function refreshPreview(w, h) {
    const aspect = w / h;
    let pw, ph;
    if (aspect >= PREVIEW_MAX_W / PREVIEW_MAX_H) {
      pw = PREVIEW_MAX_W;
      ph = PREVIEW_MAX_W / aspect;
    } else {
      ph = PREVIEW_MAX_H;
      pw = PREVIEW_MAX_H * aspect;
    }
    previewRect.style.width = `${pw}px`;
    previewRect.style.height = `${ph}px`;
    previewLabel.innerHTML = `<span class="accent">${w}</span> × <span class="accent">${h}</span>`;
  }
  refreshPreview(state.w, state.h);

  function refreshReadout(w, h) {
    ratioMP.innerHTML =
      `<span class="accent">${ratioLabel(w, h)}</span> · ${megapixels(w, h)} MP`;
    refreshPreview(w, h);
  }
  refreshReadout(state.w, state.h);

  function commit() {
    const cur = readState(node);
    const step = cur.snap || 16;
    const wRaw = safeMathEval(wInput.value);
    const hRaw = safeMathEval(hInput.value);
    // Invalid expression / empty → fall back to the LAST committed value so a
    // typo doesn't replace the user's working state with a default.
    const wNew = clampDim(snapTo(Number.isFinite(wRaw) && wRaw > 0 ? wRaw : cur.w, step));
    const hNew = clampDim(snapTo(Number.isFinite(hRaw) && hRaw > 0 ? hRaw : cur.h, step));
    wInput.value = String(wNew);
    hInput.value = String(hNew);
    refreshReadout(wNew, hNew);
    writeState(node, { ...cur, w: wNew, h: hNew, custom_w: wNew, custom_h: hNew });
  }


  function liveUpdate() {
    const wLive = safeMathEval(wInput.value);
    const hLive = safeMathEval(hInput.value);
    // Only refresh the readout/preview when BOTH expressions evaluate cleanly.
    // Otherwise the preview rectangle would jitter between valid keystrokes.
    if (Number.isFinite(wLive) && Number.isFinite(hLive) && wLive > 0 && hLive > 0) {
      refreshReadout(wLive, hLive);
    }
  }
  wInput.addEventListener("input", liveUpdate);
  hInput.addEventListener("input", liveUpdate);

  wInput.addEventListener("blur", commit);
  hInput.addEventListener("blur", commit);

  // Replace native HTML5 number-input stepping with snap-aware arrow stepping.
  // Up/Down increments by the current snap value (8/16/32/64); Shift+Up/Down
  // by 4× for coarse jumps. Evaluates the current expression first so users
  // can do "1024+8" then ArrowUp without losing the math.
  function stepInput(input, dir, multiplier) {
    const cur = readState(node);
    const step = (cur.snap || 16) * multiplier;
    const v = safeMathEval(input.value);
    const base = Number.isFinite(v) && v > 0 ? v : (input === wInput ? cur.w : cur.h);
    const next = clampDim(snapTo(base + dir * step, cur.snap || 16));
    input.value = String(next);
    liveUpdate();
  }

  for (const inp of [wInput, hInput]) {
    inp.addEventListener("keydown", (e) => {
      // Always block ComfyUI canvas shortcuts from firing while typing.
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        inp.blur();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? 1 : -1;
        const mult = e.shiftKey ? 4 : 1;
        stepInput(inp, dir, mult);
      }
    });
  }

  swap.addEventListener("click", () => {
    // Use safeMathEval too — the user may have typed math in either field.
    const w = safeMathEval(wInput.value);
    const h = safeMathEval(hInput.value);
    const wOk = Number.isFinite(w) && w > 0 ? w : state.w;
    const hOk = Number.isFinite(h) && h > 0 ? h : state.h;
    wInput.value = String(hOk);
    hInput.value = String(wOk);
    commit();
  });

  // swap is already inside `row` (between W and H fields), don't append again.
  wrap.append(row, readout, preview);
  return wrap;
}

function renderCustomRatioPanel(node, state) {
  // Photoshop "lock-aspect" pattern: user types W:H ratio once, then either
  // (a) clicks a quick-pick width chip, or (b) types into the W or H input
  // (math expressions allowed). The other dimension auto-computes from the
  // ratio and is snapped to /8/16/32/64 for AI alignment.
  const wrap = document.createElement("div");
  wrap.className = "pix-res-list pix-res-custom pix-res-ratio";

  // ── ratio inputs row (W : H, swap between) ──────────────────
  const ratioRow = document.createElement("div");
  ratioRow.className = "pix-res-ratio-input-row";

  const lbl = document.createElement("span");
  lbl.className = "pix-res-ratio-label";
  lbl.textContent = "Ratio";

  const rwInput = document.createElement("input");
  rwInput.type = "text";
  rwInput.inputMode = "numeric";
  rwInput.spellcheck = false;
  rwInput.autocomplete = "off";
  rwInput.value = String(safePositiveInt(state.custom_ratio_w, 4));
  rwInput.title = "Ratio width (positive integer)";

  const rhInput = document.createElement("input");
  rhInput.type = "text";
  rhInput.inputMode = "numeric";
  rhInput.spellcheck = false;
  rhInput.autocomplete = "off";
  rhInput.value = String(safePositiveInt(state.custom_ratio_h, 3));
  rhInput.title = "Ratio height (positive integer)";

  const ratioSwap = document.createElement("button");
  ratioSwap.type = "button";
  ratioSwap.className = "pix-res-ratio-swap";
  ratioSwap.title = "Swap ratio W ↔ H";
  ratioSwap.setAttribute("aria-label", "Swap ratio width and height");

  ratioRow.append(lbl, rwInput, ratioSwap, rhInput);

  // ── quick-pick width chips ──────────────────────────────────
  const quickRow = document.createElement("div");
  quickRow.className = "pix-res-quickpicks";
  const quickBtnEls = [];
  for (const w of QUICK_PICK_WIDTHS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pix-res-quickpick";
    btn.textContent = String(w);
    btn.dataset.w = String(w);
    quickRow.appendChild(btn);
    quickBtnEls.push(btn);
  }

  // ── W and H math-aware inputs (side-by-side, no swap between — ratio swap
  //    above already handles orientation flip) ────────────────────────────
  const fieldsRow = document.createElement("div");
  fieldsRow.className = "pix-res-custom-row";
  fieldsRow.style.gridTemplateColumns = "1fr 1fr"; // override 1fr auto 1fr (no swap col)

  const wField = document.createElement("div");
  wField.className = "pix-res-custom-field";
  const wLabel = document.createElement("label");
  wLabel.textContent = "Width";
  const wInput = document.createElement("input");
  wInput.type = "text";
  wInput.inputMode = "decimal";
  wInput.spellcheck = false;
  wInput.autocomplete = "off";
  wInput.title = "Math allowed: 1024+128, 512*2 — height auto-computes from ratio";
  wInput.value = String(state.w);
  wField.append(wLabel, wInput);

  const hField = document.createElement("div");
  hField.className = "pix-res-custom-field";
  const hLabel = document.createElement("label");
  hLabel.textContent = "Height";
  const hInput = document.createElement("input");
  hInput.type = "text";
  hInput.inputMode = "decimal";
  hInput.spellcheck = false;
  hInput.autocomplete = "off";
  hInput.title = "Math allowed: 1024+128, 512*2 — width auto-computes from ratio";
  hInput.value = String(state.h);
  hField.append(hLabel, hInput);

  fieldsRow.append(wField, hField);

  // ── readout (snap picker + ratio·MP) + aspect preview ─────────
  const readout = document.createElement("div");
  readout.className = "pix-res-readout";

  const snapGroup = document.createElement("div");
  snapGroup.className = "pix-res-snap-group";
  snapGroup.title = "Snap step (also drives Up/Down arrow nudge)";
  const snapIcon = document.createElement("span");
  snapIcon.className = "pix-res-snap-icon";
  const snapBtns = document.createElement("div");
  snapBtns.className = "pix-res-snap-btns";
  const snapBtnEls = [];
  for (const v of SNAP_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pix-res-snap-btn" + (v === (state.snap || 16) ? " active" : "");
    btn.textContent = String(v);
    btn.dataset.v = String(v);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cur = readState(node);
      writeState(node, { ...cur, snap: v });
      for (const b of snapBtnEls) b.classList.toggle("active", parseInt(b.dataset.v, 10) === v);
      // Re-snap current W and recompute H so visible values reflect new step.
      const w = safeMathEval(wInput.value);
      if (Number.isFinite(w) && w > 0) {
        commitFromW(w);
      }
    });
    snapBtns.appendChild(btn);
    snapBtnEls.push(btn);
  }
  snapGroup.append(snapIcon, snapBtns);

  const ratioMP = document.createElement("span");
  readout.append(snapGroup, ratioMP);

  const preview = document.createElement("div");
  preview.className = "pix-res-preview";
  const previewRect = document.createElement("div");
  previewRect.className = "pix-res-preview-rect";
  const previewLabel = document.createElement("div");
  previewLabel.className = "pix-res-preview-label";
  preview.append(previewRect, previewLabel);

  const PREVIEW_MAX_W = 90;
  const PREVIEW_MAX_H = 60;

  function refreshPreview(w, h) {
    const aspect = w / h;
    let pw, ph;
    if (aspect >= PREVIEW_MAX_W / PREVIEW_MAX_H) {
      pw = PREVIEW_MAX_W;
      ph = PREVIEW_MAX_W / aspect;
    } else {
      ph = PREVIEW_MAX_H;
      pw = PREVIEW_MAX_H * aspect;
    }
    previewRect.style.width = `${pw}px`;
    previewRect.style.height = `${ph}px`;
    previewLabel.innerHTML = `<span class="accent">${w}</span> × <span class="accent">${h}</span>`;
  }

  function refreshReadout(w, h) {
    // In Custom Ratio mode the user's TYPED ratio is the source of truth, so
    // show that label even when /16 snap drifts the actual W:H slightly.
    const cur = readState(node);
    const rW = safePositiveInt(cur.custom_ratio_w, 4);
    const rH = safePositiveInt(cur.custom_ratio_h, 3);
    ratioMP.innerHTML =
      `<span class="accent">${rW}:${rH}</span> · ${megapixels(w, h)} MP`;
    refreshPreview(w, h);
    // Reflect quick-pick "active" chip if W matches an exact preset.
    for (const b of quickBtnEls) {
      b.classList.toggle("active", parseInt(b.dataset.w, 10) === w);
    }
  }
  refreshReadout(state.w, state.h);

  // ── core commit helpers ──────────────────────────────────────────
  // Given a Width value, snap it and derive Height from current ratio.
  // Writes both to state and updates the inputs / readout.
  function commitFromW(rawW) {
    const cur = readState(node);
    const step = cur.snap || 16;
    const rW = safePositiveInt(cur.custom_ratio_w, 4);
    const rH = safePositiveInt(cur.custom_ratio_h, 3);
    const w = clampDim(snapTo(rawW, step));
    const h = clampDim(snapTo((w * rH) / rW, step));
    wInput.value = String(w);
    hInput.value = String(h);
    refreshReadout(w, h);
    writeState(node, { ...cur, w, h });
  }

  // Given a Height value, snap it and derive Width from current ratio.
  function commitFromH(rawH) {
    const cur = readState(node);
    const step = cur.snap || 16;
    const rW = safePositiveInt(cur.custom_ratio_w, 4);
    const rH = safePositiveInt(cur.custom_ratio_h, 3);
    const h = clampDim(snapTo(rawH, step));
    const w = clampDim(snapTo((h * rW) / rH, step));
    wInput.value = String(w);
    hInput.value = String(h);
    refreshReadout(w, h);
    writeState(node, { ...cur, w, h });
  }

  // ── live preview while typing (no commit until blur) ─────────────
  function liveUpdate(input, isWidth) {
    const v = safeMathEval(input.value);
    if (!Number.isFinite(v) || v <= 0) return;
    const cur = readState(node);
    const rW = safePositiveInt(cur.custom_ratio_w, 4);
    const rH = safePositiveInt(cur.custom_ratio_h, 3);
    if (isWidth) {
      refreshReadout(Math.round(v), Math.round((v * rH) / rW));
    } else {
      refreshReadout(Math.round((v * rW) / rH), Math.round(v));
    }
  }
  wInput.addEventListener("input", () => liveUpdate(wInput, true));
  hInput.addEventListener("input", () => liveUpdate(hInput, false));

  // ── input commit on blur ─────────────────────────────────────────
  wInput.addEventListener("blur", () => {
    const v = safeMathEval(wInput.value);
    const cur = readState(node);
    commitFromW(Number.isFinite(v) && v > 0 ? v : cur.w);
  });
  hInput.addEventListener("blur", () => {
    const v = safeMathEval(hInput.value);
    const cur = readState(node);
    commitFromH(Number.isFinite(v) && v > 0 ? v : cur.h);
  });

  // ── arrow-key stepping (same pattern as Custom Resolution) ─────
  function stepInput(input, dir, multiplier, isWidth) {
    const cur = readState(node);
    const step = (cur.snap || 16) * multiplier;
    const v = safeMathEval(input.value);
    const base = Number.isFinite(v) && v > 0 ? v : (isWidth ? cur.w : cur.h);
    const next = base + dir * step;
    if (isWidth) commitFromW(next); else commitFromH(next);
  }

  for (const [inp, isW] of [[wInput, true], [hInput, false]]) {
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        inp.blur();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? 1 : -1;
        const mult = e.shiftKey ? 4 : 1;
        stepInput(inp, dir, mult, isW);
      }
    });
  }

  // ── quick-pick chip clicks set W and recompute H ─────────────────
  quickRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".pix-res-quickpick");
    if (!btn) return;
    e.stopPropagation();
    commitFromW(parseInt(btn.dataset.w, 10));
  });

  // ── ratio input commit + validation ──────────────────────────────
  function commitRatio() {
    const rWraw = parseInt(rwInput.value, 10);
    const rHraw = parseInt(rhInput.value, 10);
    const cur = readState(node);
    const rW = Number.isFinite(rWraw) && rWraw > 0 ? rWraw : safePositiveInt(cur.custom_ratio_w, 4);
    const rH = Number.isFinite(rHraw) && rHraw > 0 ? rHraw : safePositiveInt(cur.custom_ratio_h, 3);
    rwInput.value = String(rW);
    rhInput.value = String(rH);
    const ratioChanged = rW !== cur.custom_ratio_w || rH !== cur.custom_ratio_h;
    if (ratioChanged) {
      // Recompute H from current W at the new ratio so the visible image
      // matches what the workflow will receive. Single combined write so
      // the workflow can never observe a half-updated state mid-blur.
      const step = cur.snap || 16;
      const w = clampDim(snapTo(cur.w, step));
      const h = clampDim(snapTo((w * rH) / rW, step));
      wInput.value = String(w);
      hInput.value = String(h);
      writeState(node, { ...cur, custom_ratio_w: rW, custom_ratio_h: rH, w, h });
      refreshReadout(w, h);
    }
  }

  for (const inp of [rwInput, rhInput]) {
    inp.addEventListener("blur", commitRatio);
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        inp.blur();
      }
    });
  }

  ratioSwap.addEventListener("click", () => {
    const a = rwInput.value;
    rwInput.value = rhInput.value;
    rhInput.value = a;
    commitRatio();
  });

  wrap.append(ratioRow, quickRow, fieldsRow, readout, preview);
  return wrap;
}

function ensureRoot(node) {
  // Prefer the root we created in setupResolutionNode.
  if (node._pixResRoot) return node._pixResRoot;

  // Recover after Vue/LiteGraph reparenting: look inside the DOM widget.
  const w = (node.widgets || []).find((x) => x.name === "resolution_ui");
  if (w?.element) {
    let found = w.element.querySelector(".pix-res-root");
    if (!found) {
      found = document.createElement("div");
      found.className = "pix-res-root";
      w.element.appendChild(found);
    }
    node._pixResRoot = found;
    return found;
  }
  return null;
}

/** Resolve the origin node for a named input link. */
function getLinkedOrigin(node, inputName) {
  try {
    const inputs = node.inputs || [];
    const graph = node.graph || app.graph;
    const inp = inputs.find((i) => i && i.name === inputName);
    if (!inp || inp.link == null) return null;
    const link = graph?.links?.[inp.link];
    if (!link) return null;
    return graph?.getNodeById?.(link.origin_id) || null;
  } catch {
    return null;
  }
}

/** Read a positive int from a linked upstream node (primitive / INT widget). */
function probeLinkedInt(node, inputName) {
  try {
    const origin = getLinkedOrigin(node, inputName);
    if (!origin) return 0;
    let val = origin.widgets?.find((w) => w.name === inputName)?.value;
    if (val == null) val = origin.widgets?.[0]?.value;
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Try to read pixel size from an upstream image-producing node.
 * LoadImage (and many loaders) keep the loaded HTMLImageElement on node.imgs.
 */
function probeImageSizeFromNode(origin, depth = 0) {
  if (!origin || depth > 8) return null;
  try {
    // 1) Cached HTMLImageElement(s) from Load Image / preview nodes
    const imgs = origin.imgs || origin.images || origin._images;
    if (imgs && imgs.length) {
      const idx = origin.imageIndex ?? origin.image_index ?? 0;
      const img = imgs[idx] || imgs[0];
      if (img) {
        const w = img.naturalWidth || img.width || img.w || 0;
        const h = img.naturalHeight || img.height || img.h || 0;
        if (w > 0 && h > 0) return { w: Math.round(w), h: Math.round(h) };
      }
    }
    // 2) Properties some loaders set
    const props = origin.properties || {};
    for (const [wk, hk] of [
      ["image_width", "image_height"],
      ["width", "height"],
      ["img_w", "img_h"],
      ["W", "H"],
    ]) {
      const pw = Number(props[wk]);
      const ph = Number(props[hk]);
      if (pw > 0 && ph > 0) return { w: Math.round(pw), h: Math.round(ph) };
    }
    // 3) DOM preview <img> inside the node (if present)
    const el = origin.widgets?.find?.((w) => w.element)?.element
      || origin.canvasEl
      || null;
    const root = el?.closest?.(".litegraph-node, .graphnode, .comfy-node") || el;
    if (root?.querySelector) {
      const domImg = root.querySelector("img");
      if (domImg) {
        const w = domImg.naturalWidth || 0;
        const h = domImg.naturalHeight || 0;
        if (w > 0 && h > 0) return { w: Math.round(w), h: Math.round(h) };
      }
    }
    // 4) Walk upstream IMAGE links (passthrough / preview / resize nodes)
    const graph = origin.graph || app.graph;
    for (const inp of origin.inputs || []) {
      if (!inp || inp.link == null) continue;
      if (inp.type && inp.type !== "IMAGE" && inp.type !== "*") continue;
      const link = graph?.links?.[inp.link];
      if (!link) continue;
      const up = graph?.getNodeById?.(link.origin_id);
      const found = probeImageSizeFromNode(up, depth + 1);
      if (found) return found;
    }
  } catch { /* ignore */ }
  return null;
}

/** Size from the connected image chain only (W/H sockets are ignored). */
function probeIncomingSize(node) {
  const imgOrigin = getLinkedOrigin(node, "image");
  const fromImg = imgOrigin ? probeImageSizeFromNode(imgOrigin) : null;
  if (fromImg && fromImg.w > 0 && fromImg.h > 0) {
    return { ...fromImg, source: "image" };
  }
  // Last known size from a previous run (set by execution hook)
  if (node._pixLastInW > 0 && node._pixLastInH > 0) {
    return { w: node._pixLastInW, h: node._pixLastInH, source: "cached" };
  }
  return null;
}

/** Back-compat alias used by the Use-Input toggle click handler. */
function probeLinkedWH(node) {
  const s = probeIncomingSize(node);
  return (s && s.w > 0 && s.h > 0) ? { w: s.w, h: s.h } : null;
}

function formatSwitchLabel(state, node) {
  if (!state.use_input) {
    return (
      "<strong>Use Input Resolution</strong>" +
      '<span class="pix-res-switch-sub">off — use picker below</span>'
    );
  }
  const incoming = probeIncomingSize(node);
  const hasImage = (node.inputs || []).some((i) => i.name === "image" && i.link != null);

  let title;
  if (incoming && incoming.w > 0 && incoming.h > 0) {
    title =
      `<strong>Use Input Resolution of ` +
      `<span class="accent">${incoming.w}</span> × ` +
      `<span class="accent">${incoming.h}</span></strong>`;
  } else if (hasImage) {
    title =
      '<strong>Use Input Resolution of <span class="accent">…</span></strong>';
  } else {
    title = "<strong>Use Input Resolution</strong>";
  }

  const sub = hasImage
    ? "image size → width, height & latent"
    : "connect an image input";
  return title + `<span class="pix-res-switch-sub">${sub}</span>`;
}

function renderUI(node) {
  const state = readState(node);
  const root = ensureRoot(node);
  // Paint even if the element is not yet connected to the document —
  // content will appear as soon as LiteGraph attaches the widget.
  if (!root) return;

  root.innerHTML = "";

  // ── Use Input Resolution switch (top) ────────────────────────────
  const switchRow = document.createElement("div");
  switchRow.className = "pix-res-switch-row";
  const switchLabel = document.createElement("div");
  switchLabel.className = "pix-res-switch-label";
  switchLabel.innerHTML = formatSwitchLabel(state, node);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "pix-res-toggle" + (state.use_input ? " on" : "");
  toggle.title = "When ON: size comes only from the connected image (width/height sockets ignored); picker is disabled.\nWhen OFF: size comes from the presets / custom UI.";
  toggle.setAttribute("aria-pressed", state.use_input ? "true" : "false");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const cur = readState(node);
    const next = !cur.use_input;
    const patch = { ...cur, use_input: next };
    if (next) {
      // Turning ON — adopt image size for the label when known.
      const linked = probeLinkedWH(node);
      if (linked) {
        patch.w = linked.w;
        patch.h = linked.h;
      }
    } else {
      // Turning OFF — auto-select highest preset for the current ratio.
      if ((cur.mode || "preset") === "preset") {
        const sizes = getResolutionProfile(cur).sizes[cur.ratio] || [];
        if (sizes.length) {
          const [w, h] = highestPreset(sizes);
          patch.w = w;
          patch.h = h;
          patch.mode = "preset";
        }
      }
    }
    writeState(node, patch);
    renderUI(node);
  });
  switchRow.append(switchLabel, toggle);
  root.appendChild(switchRow);

  // ── Scale input image (Keep Same / 2K / 3K / 4K) ─────────────────
  // Only active when Use Input is ON (scales the connected image).
  const scaleRow = document.createElement("div");
  scaleRow.className = "pix-res-scale-row" + (state.use_input ? "" : " disabled");
  const scaleLabel = document.createElement("div");
  scaleLabel.className = "pix-res-scale-label";
  scaleLabel.textContent = "Scale input image";
  const scaleSelect = document.createElement("select");
  scaleSelect.className = "pix-res-scale-select";
  scaleSelect.disabled = !state.use_input;
  scaleSelect.title =
    "Keep Same: no rescaling.\n" +
    "2K / 3K / 4K: scale total pixel area to ≈2048² / 3072² / 4096² while keeping aspect ratio (up or down).";
  // Migrate old fit_2k boolean if present in loaded state
  let scaleMode = state.scale_mode || (state.fit_2k ? "2k" : "keep");
  if (!["keep", "2k", "3k", "4k"].includes(scaleMode)) scaleMode = "keep";
  for (const [val, label] of [
    ["keep", "Keep Same"],
    ["2k", "2K"],
    ["3k", "3K"],
    ["4k", "4K"],
  ]) {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    opt.selected = scaleMode === val;
    scaleSelect.appendChild(opt);
  }
  scaleSelect.addEventListener("change", (e) => {
    e.stopPropagation();
    const cur = readState(node);
    writeState(node, { ...cur, scale_mode: scaleSelect.value, fit_2k: false });
    renderUI(node);
  });
  // Prevent canvas key handling while using the select
  scaleSelect.addEventListener("keydown", (e) => e.stopPropagation());
  scaleSelect.addEventListener("mousedown", (e) => e.stopPropagation());
  scaleRow.append(scaleLabel, scaleSelect);
  root.appendChild(scaleRow);

  // ── Picker body (grayed out when use_input is ON) ────────────────
  const body = document.createElement("div");
  body.className = "pix-res-body" + (state.use_input ? " disabled" : "");
  body.appendChild(renderProfileSelect(node, state));
  body.appendChild(renderChipGrid(state));
  if (state.mode === "custom") {
    body.appendChild(renderCustomPanel(node, state));
  } else if (state.mode === "custom_ratio") {
    body.appendChild(renderCustomRatioPanel(node, state));
  } else {
    body.appendChild(renderSizeList(state));
  }
  root.appendChild(body);

  // Resize the node to fit the current resolution table / panel.
  applyNodeSize(node, state);
}

function setupResolutionNode(node) {
  // Defensive: if a widget for ResolutionState somehow exists (stale Python
  // not yet restarted, or a workflow loaded under the old architecture),
  // hide it. With the current Python (hidden input), no widget is created
  // and this is a no-op.
  // Hide the ResolutionState STRING widget (it still serializes into the prompt).
  hideJsonWidget(node.widgets, HIDDEN_INPUT_NAME);
  hideJsonWidget(node.widgets, "ResolutionState");
  // Seed widget from properties if empty so the first run has valid JSON.
  {
    const sw = findStateWidget(node);
    if (sw) {
      if (!sw.value || typeof sw.value !== "string" || !sw.value.includes('"mode"')) {
        sw.value = node.properties?.[STATE_PROP] || JSON.stringify(DEFAULT_STATE);
      }
      // Keep the multiline text box from eating vertical space even if hide fails.
      sw.computeSize = () => [0, -4];
      sw.draw = () => {};
    }
  }

  // Width locked; height auto-sizes to the active resolution table.
  node.resizable = false;
  applyNodeSize(node);

  const root = document.createElement("div");
  root.className = "pix-res-root";

  installCanvasZoomPassthrough(root);
  installNodeAccent(node, root);
  const _widget = node.addDOMWidget("resolution_ui", "custom", root, {
    getValue: () => readState(node),
    setValue: (_v) => {},
    getMinHeight: () => computeWidgetH(readState(node)),
    getMaxHeight: () => computeWidgetH(readState(node)),
    margin: 4,
    serialize: false,
  });
  applyAdaptiveCanvasOnly(_widget);

  // Some frontend builds wrap the element we pass; make sure our root is
  // actually inside the live widget element and fill the available height.
  if (_widget?.element) {
    if (!_widget.element.contains(root)) {
      _widget.element.innerHTML = "";
      _widget.element.appendChild(root);
    }
    _widget.element.style.overflow = "hidden";
    _widget.element.style.height = "100%";
  }

  const _onClick = (e) => {
    // Picker interactions are blocked when Use Input Resolution is ON
    // (body has pointer-events:none, but guard here as well).
    const curCheck = readState(node);
    if (curCheck.use_input) {
      // Still allow the switch itself (handled by its own listener).
      if (!e.target.closest(".pix-res-toggle") && !e.target.closest(".pix-res-switch-row")) {
        return;
      }
    }
    const chip = e.target.closest(".pix-res-chip");
    if (chip) {
      const id = chip.dataset.chipId;
      const cur = readState(node);
      if (id === "custom") {
        writeState(node, {
          ...cur,
          mode: "custom",
          w: cur.custom_w ?? 1024,
          h: cur.custom_h ?? 1024,
        });
      } else if (id === "custom_ratio") {
        // Preserve current W if it's reasonable (>= 256); otherwise default
        // to 1024. Height auto-computes from the saved ratio
        // and snaps to the current step so the panel opens with valid dims.
        const rW = safePositiveInt(cur.custom_ratio_w, 4);
        const rH = safePositiveInt(cur.custom_ratio_h, 3);
        const step = cur.snap || 16;
        const w = clampDim(snapTo(cur.w >= 256 ? cur.w : 1024, step));
        const h = clampDim(snapTo((w * rH) / rW, step));
        writeState(node, { ...cur, mode: "custom_ratio", w, h });
      } else {
        const sizes = getResolutionProfile(cur).sizes[id];
        if (!sizes) return;
        const [w, h] = highestPreset(sizes);
        writeState(node, { ...cur, mode: "preset", ratio: id, w, h });
      }
      renderUI(node);
      return;
    }
    const row = e.target.closest(".pix-res-row");
    if (row && !row.classList.contains("empty") && row.dataset.w) {
      const w = parseInt(row.dataset.w, 10);
      const h = parseInt(row.dataset.h, 10);
      const cur = readState(node);
      writeState(node, { ...cur, w, h });
      renderUI(node);
      // Focus the freshly-rendered list so the next ArrowUp/Down keystroke is
      // captured by the list — without this, the click moves focus to the
      // overlay/canvas and arrows don't reach us.
      const list = root.querySelector(".pix-res-list:not(.pix-res-custom)");
      list?.focus();
      list?.querySelector(".pix-res-row.active")?.scrollIntoView({ block: "nearest" });
    }
  };

  // Arrow-key navigation in preset mode (size list). The list is `tabindex=0`
  // so it can receive focus; we delegate at root level so the listener
  // survives every re-render. `stopPropagation` prevents ComfyUI's canvas
  // from interpreting the arrow keys as graph pan. Custom modes have their
  // own per-input arrow handlers (snap-step), not list-row navigation.
  const _onKeydown = (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const list = e.target.closest(".pix-res-list");
    if (!list || list.classList.contains("pix-res-custom")) return;
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const cur = readState(node);
    if (cur.use_input) return; // picker disabled while using input resolution
    if (cur.mode !== "preset") return;
    const sizes = getResolutionProfile(cur).sizes[cur.ratio] || [];
    if (sizes.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    let idx = sizes.findIndex(([w, h]) => w === cur.w && h === cur.h);
    if (idx < 0) idx = 0;
    if (e.key === "ArrowUp")        idx = Math.max(0, idx - 1);
    else if (e.key === "ArrowDown") idx = Math.min(sizes.length - 1, idx + 1);
    else if (e.key === "Home")      idx = 0;
    else if (e.key === "End")       idx = sizes.length - 1;
    const [w, h] = sizes[idx];
    if (w === cur.w && h === cur.h) return;
    writeState(node, { ...cur, w, h });
    renderUI(node);
    const newList = root.querySelector(".pix-res-list:not(.pix-res-custom)");
    newList?.focus();
    newList?.querySelector(".pix-res-row.active")?.scrollIntoView({ block: "nearest" });
  };

  // Attach to both root and the widget container so a Vue rebuild still routes events.
  root.addEventListener("click", _onClick);
  root.addEventListener("keydown", _onKeydown);
  if (_widget?.element) {
    _widget.element.addEventListener("click", _onClick);
    _widget.element.addEventListener("keydown", _onKeydown);
  }

  node._pixResRoot = root;

  // Refresh label when image/W/H links change (LoadImage may populate imgs later).
  const _origConn = node.onConnectionsChange;
  node.onConnectionsChange = function (...args) {
    const r = _origConn?.apply(this, args);
    queueMicrotask(() => {
      try { renderUI(this); } catch { /* ignore */ }
    });
    // LoadImage sets node.imgs asynchronously after file pick — retry a few times.
    let tries = 0;
    const tick = () => {
      tries += 1;
      try { renderUI(this); } catch { /* ignore */ }
      if (tries < 8) setTimeout(tick, 250);
    };
    setTimeout(tick, 100);
    return r;
  };

  // Paint now and retry a few times — LiteGraph/Vue often attach the widget
  // element a frame or two later. renderUI also calls applyNodeSize.
  const paint = () => {
    try {
      renderUI(node);
    } catch (err) {
      console.error("[Tallron] MP Resolution render failed", err);
    }
  };
  paint();
  queueMicrotask(paint);
  requestAnimationFrame(paint);
  setTimeout(paint, 0);
  setTimeout(paint, 50);
  setTimeout(paint, 200);
  setTimeout(paint, 500);
  setTimeout(paint, 1200);
}

app.registerExtension({
  name: "Tallron.MPResolution",

  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "TallronMPResolutionSelector") return;

    // onConfigure fires whenever configure() is called — catches the case
    // where a user opens a different workflow into an already-constructed
    // node. Re-render so the UI matches the freshly-applied widget value.
    const _origConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
      const r = _origConfigure?.apply(this, arguments);
      if (this._pixResRoot) renderUI(this);
      return r;
    };

    // Re-clamp on every resize attempt: width locked, height follows the
    // current resolution table (profile × ratio / custom panel).
    const _origResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function (size) {
      const st = readState(this);
      this.size[0] = NODE_W;
      this.size[1] = computeNodeH(st);
      if (_origResize) return _origResize.call(this, size);
    };
  },

  // After a run, cache this node's output W/H so the switch label can show
  // real numbers even when the upstream LoadImage has no imgs yet.
  setup() {
    const api = app.api;
    if (!api || typeof api.addEventListener !== "function") return;
    api.addEventListener("executed", ({ detail }) => {
      try {
        if (!detail || !detail.node) return;
        const id = String(detail.node);
        const graph = app.graph;
        const node = graph?.getNodeById?.(parseInt(id, 10)) || graph?.getNodeById?.(id);
        if (!node) return;
        const cls = node.comfyClass || node.type;
        if (cls !== "TallronMPResolutionSelector") return;
        // outputs: [image, width, height, latent] — width/height are INT
        const out = detail.output;
        if (!out) return;
        // ComfyUI packs outputs as arrays per slot
        const wArr = out[1] || out.width;
        const hArr = out[2] || out.height;
        const w = Array.isArray(wArr) ? Number(wArr[0]) : Number(wArr);
        const h = Array.isArray(hArr) ? Number(hArr[0]) : Number(hArr);
        if (w > 0 && h > 0) {
          node._pixLastInW = Math.round(w);
          node._pixLastInH = Math.round(h);
          if (node._pixResRoot) renderUI(node);
        }
      } catch { /* ignore */ }
    });
  },

  // nodeCreated fires DURING node construction, BEFORE configure() is called
  // to restore saved widget values (CLAUDE.md Pattern #8). The initial
  // populate of the DOM widget is therefore deferred to queueMicrotask
  // inside setupResolutionNode so configure has a chance to land the saved
  // value first — without that defer, the panel renders defaults and flashes
  // to the saved state milliseconds later.
  nodeCreated(node) {
    const cls = node.comfyClass || node.type;
    if (cls !== "TallronMPResolutionSelector") return;
    try {
      setupResolutionNode(node);
    } catch (err) {
      console.error("[Tallron] MP Resolution setup failed", err);
    }
  },
});

// Inject the per-node state into the API prompt at execution time. Python's
// `hidden` ResolutionState input expects a STRING value but doesn't get one
// from the workflow JSON (no widget exists). Patch app.graphToPrompt so each
// TallronMPResolutionSelector node's prompt entry gets its `inputs.ResolutionState`
// populated from node.properties[STATE_PROP] right before submission.
//
// Subgraph-safe lookup: ComfyUI's new subgraph system flattens contained nodes
// into the API prompt with composite string IDs (e.g. "5:12"), and `app.graph`
// only exposes top-level nodes — so the previous `parseInt(id) + getNodeById`
// path silently missed any TallronMPResolutionSelector placed inside a subgraph and
// the user got a TypeError at execution. Identify pixaroma entries directly
// by `class_type` in the API prompt, and resolve their state via a recursive
// walk over every nested subgraph. Falls back to DEFAULT_STATE if a node
// can't be found so the workflow never crashes — worst case the user sees the
// 1024×1024 default instead of their pick.
function buildPixaromaNodeIndex() {
  const index = new Map(); // String(node.id) → node
  const visit = (graph) => {
    if (!graph) return;
    const nodes = graph._nodes || graph.nodes || [];
    for (const n of nodes) {
      if (!n) continue;
      if (n.comfyClass === "TallronMPResolutionSelector" || n.type === "TallronMPResolutionSelector") {
        index.set(String(n.id), n);
      }
      // ComfyUI subgraph instances expose their inner graph at one of these
      // keys depending on frontend version; check all known shapes.
      const inner = n.subgraph || n.graph || n._graph;
      if (inner && inner !== graph) visit(inner);
    }
  };
  visit(app.graph);
  return index;
}

function findPixaromaNode(index, promptId) {
  // Try exact match first; then strip any subgraph prefix ("5:12" → "12") so
  // we still hit the inner node when ComfyUI prefixes IDs in the API prompt.
  const sId = String(promptId);
  if (index.has(sId)) return index.get(sId);
  const tail = sId.includes(":") ? sId.slice(sId.lastIndexOf(":") + 1) : null;
  if (tail && index.has(tail)) return index.get(tail);
  return null;
}

const _origGraphToPrompt_fn = app.graphToPrompt;
const _origGraphToPrompt = (...a) => _origGraphToPrompt_fn.apply(app, a);
app.graphToPrompt = async function (...args) {
  const result = await _origGraphToPrompt(...args);
  // FAIL OPEN - see the note in pause_image: a throw here rejects ComfyUI's
  // own graphToPrompt and breaks Run for the whole workflow. Never wrap the
  // `await _origGraphToPrompt` above; a failure in CORE must propagate.
  try {
    const out = result?.output;
    if (out) {
      let index = null;
      for (const id in out) {
        const entry = out[id];
        if (!entry || entry.class_type !== "TallronMPResolutionSelector") continue;
        if (!index) index = buildPixaromaNodeIndex();
        const node = findPixaromaNode(index, id);
        // Prefer the live widget value (native serialization source of truth),
        // then properties, then defaults.
        let state = null;
        const sw = node ? findStateWidget(node) : null;
        if (sw && typeof sw.value === "string" && sw.value) state = sw.value;
        if (!state) state = node?.properties?.[STATE_PROP] || null;
        if (!state) state = JSON.stringify(DEFAULT_STATE);
        entry.inputs = entry.inputs || {};
        entry.inputs[HIDDEN_INPUT_NAME] = state;
        entry.inputs.ResolutionState = state;
      }
    }
  } catch (e) {
    console.error("[Tallron] MP Resolution prompt injection failed; prompt sent unchanged", e);
  }
  return result;
};

// The colour option: gives this node a right-click "Resolution settings" entry, the
// gear in the selection toolbar, and the shared colour panel behind both.
registerNodeAccent("TallronMPResolutionSelector", { title: "MP Resolution Selector" });
