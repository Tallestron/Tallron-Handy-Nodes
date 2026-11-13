import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "TallronReferenceImageLoader";
const MAX_SLOTS = 16;
const ORIG_SLOT = 0;
const BATCH_SLOT = 1;
const IMAGE_SLOT0 = 2;
const CROP_PROP = "ril_crop";
const HIDDEN_INPUT_NAME = "crop";
const CSS_ID = "tallron-ref-loader-crop-css";

const NODE_WIDTH = 440;
const CONTROLS_HEIGHT = 70;
const GRID_PAD = 12;
const GAP = 8;
const MIN_CELL = 90;
const MAX_CELL = 160;

function injectCropCSS() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement("style");
  style.id = CSS_ID;
  style.textContent = `
    .tld-crop-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.72);
      display: flex; align-items: center; justify-content: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    .tld-crop-dialog {
      background: #2a2a2a; border: 1px solid #555; border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.55);
      display: flex; flex-direction: column;
      max-width: 92vw; max-height: 92vh; overflow: hidden;
      color: #e8e8e8;
    }
    .tld-crop-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-bottom: 1px solid #444;
      gap: 12px; flex-shrink: 0;
    }
    .tld-crop-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #fff; }
    .tld-crop-header .tld-meta { font-size: 12px; color: #aaa; font-variant-numeric: tabular-nums; }
    .tld-crop-body {
      position: relative; flex: 1; min-height: 200px;
      display: flex; align-items: center; justify-content: center;
      background: #1a1a1a; overflow: auto; padding: 12px;
    }
    .tld-crop-stage {
      position: relative; display: inline-block; line-height: 0;
      user-select: none; -webkit-user-select: none;
      cursor: crosshair; max-width: 100%;
    }
    .tld-crop-stage img {
      display: block; max-width: min(88vw, 1400px);
      max-height: min(72vh, 900px);
      width: auto; height: auto; pointer-events: none;
    }
    .tld-crop-stage canvas.tld-overlay {
      position: absolute; left: 0; top: 0; width: 100%; height: 100%;
      pointer-events: none;
    }
    .tld-crop-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-top: 1px solid #444;
      gap: 10px; flex-shrink: 0; flex-wrap: wrap;
    }
    .tld-crop-footer .tld-hint { font-size: 11px; color: #888; flex: 1; }
    .tld-btn {
      appearance: none; border: 1px solid #666; background: #3a3a3a;
      color: #eee; border-radius: 6px; padding: 6px 14px;
      font-size: 12px; cursor: pointer; font-weight: 500;
    }
    .tld-btn:hover { background: #4a4a4a; border-color: #888; }
    .tld-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .tld-btn.primary { background: #3d6eb5; border-color: #5BA3F5; color: #fff; }
    .tld-btn.primary:hover { background: #4a7fc4; }
    .tld-btn.danger { background: #5a3030; border-color: #a55; color: #fcc; }
    .tld-btn.danger:hover { background: #6a3a3a; }
    .ril-slot-crop-btn {
      appearance: none; border: 1px solid rgba(255,255,255,0.25);
      background: rgba(0,0,0,0.55); color: #ddd;
      border-radius: 3px; padding: 1px 5px; font-size: 10px;
      cursor: pointer; line-height: 14px;
      position: absolute; top: 3px; left: 3px; z-index: 2;
      backdrop-filter: blur(2px);
    }
    .ril-slot-crop-btn:hover { background: rgba(30,30,30,0.85); color: #fff; border-color: #5BA3F5; }
    .ril-slot-crop-btn.active { background: rgba(61,110,181,0.9); border-color: #5BA3F5; color: #fff; }
    .ril-slot-preview { position: relative; }
    .ril-slot-handle {
      cursor: grab;
      color: #666;
      font-size: 12px;
      line-height: 1;
      padding: 0 4px 0 0;
      user-select: none;
      letter-spacing: -1px;
    }
    .ril-slot-handle:hover { color: #5BA3F5; }
    .ref-slot.ril-dragging {
      opacity: 0.45;
      border-color: #5BA3F5 !important;
    }
    .ref-slot.ril-drop-target {
      border-color: #5BA3F5 !important;
      background: #1e2a3a !important;
      box-shadow: inset 0 0 0 1px #5BA3F5;
    }
  `;
  document.head.appendChild(style);
}

function parseOneCrop(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (
    typeof raw.x === "number" &&
    typeof raw.y === "number" &&
    typeof raw.w === "number" &&
    typeof raw.h === "number" &&
    raw.w > 0.001 &&
    raw.h > 0.001
  ) {
    return { x: raw.x, y: raw.y, w: raw.w, h: raw.h };
  }
  return null;
}

/** Returns array of length 10 with crop boxes or null. */
function readCrops(node) {
  const empty = () => Array(MAX_SLOTS).fill(null);
  if (!node) return empty();

  let raw = node.properties?.[CROP_PROP];
  if (!raw) {
    const w = node.widgets?.find((x) => x.name === HIDDEN_INPUT_NAME);
    raw = w?.value;
  }
  if (!raw || !String(raw).trim()) return empty();

  try {
    const d = typeof raw === "string" ? JSON.parse(raw) : raw;
    // Legacy single-box → slot 0
    if (d && typeof d === "object" && !Array.isArray(d) && "x" in d) {
      const out = empty();
      out[0] = parseOneCrop(d);
      return out;
    }
    if (Array.isArray(d)) {
      const out = empty();
      for (let i = 0; i < MAX_SLOTS; i++) {
        out[i] = i < d.length ? parseOneCrop(d[i]) : null;
      }
      return out;
    }
  } catch (_) {}
  return empty();
}

function writeCrops(node, crops) {
  if (!node) return;
  if (!node.properties) node.properties = {};
  const padded = [];
  let any = false;
  for (let i = 0; i < MAX_SLOTS; i++) {
    const c = crops && i < crops.length ? crops[i] : null;
    if (c) {
      any = true;
      padded.push({
        x: +c.x.toFixed(6),
        y: +c.y.toFixed(6),
        w: +c.w.toFixed(6),
        h: +c.h.toFixed(6),
      });
    } else {
      padded.push(null);
    }
  }
  const json = any ? JSON.stringify(padded) : "";
  if (any) node.properties[CROP_PROP] = json;
  else delete node.properties[CROP_PROP];
  const w = node.widgets?.find((x) => x.name === HIDDEN_INPUT_NAME);
  if (w) w.value = json;
  node.setDirtyCanvas?.(true, true);
}

function setSlotCrop(node, zeroBasedIndex, box) {
  const crops = readCrops(node);
  crops[zeroBasedIndex] = box;
  writeCrops(node, crops);
}

function getPreviewUrl(filename) {
  if (!filename || !String(filename).trim()) return null;
  return api.apiURL(
    `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=&rand=${Date.now()}`
  );
}

function openCropModal(fullImg, existingCrop, titleText) {
  return new Promise((resolve) => {
    injectCropCSS();

    const overlay = document.createElement("div");
    overlay.className = "tld-crop-overlay";

    const dialog = document.createElement("div");
    dialog.className = "tld-crop-dialog";

    const header = document.createElement("div");
    header.className = "tld-crop-header";
    const title = document.createElement("h3");
    title.textContent = titleText || "Crop Image";
    const meta = document.createElement("div");
    meta.className = "tld-meta";
    meta.textContent = fullImg.naturalWidth + " × " + fullImg.naturalHeight;
    header.append(title, meta);

    const body = document.createElement("div");
    body.className = "tld-crop-body";
    const stage = document.createElement("div");
    stage.className = "tld-crop-stage";
    const imgEl = document.createElement("img");
    imgEl.src = fullImg.src;
    imgEl.alt = "Crop source";
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.className = "tld-overlay";
    stage.append(imgEl, overlayCanvas);
    body.appendChild(stage);

    const footer = document.createElement("div");
    footer.className = "tld-crop-footer";
    const hint = document.createElement("div");
    hint.className = "tld-hint";
    hint.textContent =
      "Drag on the image to draw a crop box. Drag inside to move. Escape to cancel.";

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";

    const btnClear = document.createElement("button");
    btnClear.className = "tld-btn danger";
    btnClear.textContent = "Clear crop";
    const btnCancel = document.createElement("button");
    btnCancel.className = "tld-btn";
    btnCancel.textContent = "Cancel";
    const btnApply = document.createElement("button");
    btnApply.className = "tld-btn primary";
    btnApply.textContent = "Apply";

    btnRow.append(btnClear, btnCancel, btnApply);
    footer.append(hint, btnRow);

    dialog.append(header, body, footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    let box = existingCrop ? { ...existingCrop } : null;
    let dragging = false;
    let mode = null;
    let startNx = 0,
      startNy = 0;
    let originBox = null;

    function clientToNatural(clientX, clientY) {
      const r = imgEl.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return { nx: 0, ny: 0 };
      let nx = (clientX - r.left) / r.width;
      let ny = (clientY - r.top) / r.height;
      nx = Math.max(0, Math.min(1, nx));
      ny = Math.max(0, Math.min(1, ny));
      return { nx, ny };
    }

    function drawOverlay() {
      const r = imgEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = r.width;
      const cssH = r.height;
      if (cssW < 1 || cssH < 1) return;

      overlayCanvas.width = Math.round(cssW * dpr);
      overlayCanvas.height = Math.round(cssH * dpr);
      overlayCanvas.style.width = cssW + "px";
      overlayCanvas.style.height = cssH + "px";

      const ctx = overlayCanvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!box || box.w <= 0 || box.h <= 0) {
        meta.textContent =
          fullImg.naturalWidth + " × " + fullImg.naturalHeight + "  ·  no crop";
        return;
      }

      const x = box.x * cssW;
      const y = box.y * cssH;
      const w = box.w * cssW;
      const h = box.h * cssH;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.clearRect(x, y, w, h);

      ctx.strokeStyle = "#5BA3F5";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      const hs = 7;
      ctx.fillStyle = "#5BA3F5";
      for (const [cx, cy] of [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ]) {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
      }

      const pw = Math.max(1, Math.round(box.w * fullImg.naturalWidth));
      const ph = Math.max(1, Math.round(box.h * fullImg.naturalHeight));
      meta.textContent =
        fullImg.naturalWidth +
        " × " +
        fullImg.naturalHeight +
        "  →  " +
        pw +
        " × " +
        ph;

      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      const label = pw + " × " + ph;
      const tw = ctx.measureText(label).width;
      const lx = x + 4;
      const ly = y + 16;
      ctx.fillRect(lx - 2, ly - 11, tw + 6, 14);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, lx, ly);
    }

    function close(result) {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(result);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close("cancel");
      }
    }
    document.addEventListener("keydown", onKey);

    btnCancel.addEventListener("click", () => close("cancel"));
    btnClear.addEventListener("click", () => {
      box = null;
      drawOverlay();
    });
    btnApply.addEventListener("click", () => {
      if (!box || box.w < 0.001 || box.h < 0.001) close(null);
      else close({ ...box });
    });

    stage.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { nx, ny } = clientToNatural(e.clientX, e.clientY);
      if (box && box.w > 0 && box.h > 0) {
        const inside =
          nx >= box.x &&
          nx <= box.x + box.w &&
          ny >= box.y &&
          ny <= box.y + box.h;
        if (inside) {
          mode = "move";
          originBox = { ...box };
          startNx = nx;
          startNy = ny;
          dragging = true;
          return;
        }
      }
      mode = "draw";
      startNx = nx;
      startNy = ny;
      box = { x: nx, y: ny, w: 0, h: 0 };
      dragging = true;
      drawOverlay();
    });

    window.addEventListener(
      "mousemove",
      (e) => {
        if (!dragging) return;
        const { nx, ny } = clientToNatural(e.clientX, e.clientY);
        if (mode === "draw") {
          const x0 = Math.min(startNx, nx);
          const y0 = Math.min(startNy, ny);
          const x1 = Math.max(startNx, nx);
          const y1 = Math.max(startNy, ny);
          box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
          drawOverlay();
        } else if (mode === "move" && originBox) {
          let dx = nx - startNx;
          let dy = ny - startNy;
          let nx0 = originBox.x + dx;
          let ny0 = originBox.y + dy;
          nx0 = Math.max(0, Math.min(1 - originBox.w, nx0));
          ny0 = Math.max(0, Math.min(1 - originBox.h, ny0));
          box = { x: nx0, y: ny0, w: originBox.w, h: originBox.h };
          drawOverlay();
        }
      },
      true
    );

    window.addEventListener(
      "mouseup",
      () => {
        if (!dragging) return;
        dragging = false;
        mode = null;
        if (box && (box.w < 0.005 || box.h < 0.005)) {
          box = existingCrop ? { ...existingCrop } : null;
        }
        drawOverlay();
      },
      true
    );

    imgEl.onload = () => drawOverlay();
    if (imgEl.complete) drawOverlay();

    overlay.tabIndex = 0;
    overlay.focus();
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close("cancel");
    });
  });
}

function buildRefLoaderIndex() {
  const index = new Map();
  const visit = (graph) => {
    if (!graph) return;
    const nodes = graph._nodes || graph.nodes || [];
    for (const n of nodes) {
      if (!n) continue;
      if (n.comfyClass === NODE_NAME || n.type === NODE_NAME) {
        index.set(String(n.id), n);
      }
      const inner = n.subgraph || n.graph || n._graph;
      if (inner && inner !== graph) visit(inner);
    }
  };
  visit(app.graph);
  return index;
}

function findRefLoaderNode(index, promptId) {
  const sId = String(promptId);
  if (index.has(sId)) return index.get(sId);
  const tail = sId.includes(":") ? sId.slice(sId.lastIndexOf(":") + 1) : null;
  if (tail && index.has(tail)) return index.get(tail);
  return null;
}

if (!app._rilCropHookInstalled) {
  app._rilCropHookInstalled = true;
  const _orig = app.graphToPrompt.bind(app);
  app.graphToPrompt = async function (...args) {
    const result = await _orig(...args);
    try {
      const out = result?.output;
      if (out) {
        let index = null;
        for (const id in out) {
          const entry = out[id];
          if (!entry || entry.class_type !== NODE_NAME) continue;
          if (!index) index = buildRefLoaderIndex();
          const node = findRefLoaderNode(index, id);
          entry.inputs = entry.inputs || {};
          const raw = node?.properties?.[CROP_PROP] || "";
          entry.inputs[HIDDEN_INPUT_NAME] = raw;
          entry.inputs.crop = raw;
        }
      }
    } catch (e) {
      console.error("[Tallron] ReferenceImageLoader crop injection failed", e);
    }
    return result;
  };
}

app.registerExtension({
  name: "Tallron.ReferenceImageLoader",

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name !== NODE_NAME) return;

    function getWidget(node, name) {
      return node.widgets?.find((w) => w.name === name);
    }

    function isZeroBased(node) {
      const w = getWidget(node, "index_style");
      const v = (w?.value || "").toString();
      return v.startsWith("0");
    }

    function setOutputName(output, name) {
      if (!output) return;
      output.name = name;
      if (output.localized_name !== undefined) output.localized_name = name;
    }

    function slotTitle(output) {
      return `${output?.name || ""} ${output?.localized_name || ""}`.toLowerCase();
    }

    function isLegacyOutputOrder(outputs) {
      if (!outputs || outputs.length < MAX_SLOTS + 2) return false;
      if (slotTitle(outputs[0]).includes("orig")) return false;
      return (
        slotTitle(outputs[MAX_SLOTS]).includes("batch") &&
        slotTitle(outputs[MAX_SLOTS + 1]).includes("orig")
      );
    }

    function imageOutputName(node, zeroBasedIndex) {
      const n = isZeroBased(node) ? zeroBasedIndex : zeroBasedIndex + 1;
      return `Image ${n}`;
    }

    function nameOutputs(node) {
      const outs = node.outputs;
      if (!outs || outs.length < 2) return;
      const zero = isZeroBased(node);
      setOutputName(outs[ORIG_SLOT], zero ? "Image 0 orig size" : "Image 1 orig size");
      setOutputName(outs[BATCH_SLOT], "full batch");
      for (let i = 0; i + IMAGE_SLOT0 < outs.length && i < MAX_SLOTS; i++) {
        setOutputName(outs[IMAGE_SLOT0 + i], imageOutputName(node, i));
      }
    }

    function getLayoutWidth(node) {
      const w = getWidget(node, "layout_width");
      let n = parseInt(w?.value, 10);
      if (isNaN(n) || n < 2) n = 2;
      if (n > 4) n = 4;
      return n;
    }

    function slotLabel(node, zeroBasedIndex) {
      const n = isZeroBased(node) ? zeroBasedIndex : zeroBasedIndex + 1;
      return `Image ${n}`;
    }

    function readFilenames(node) {
      const w = getWidget(node, "images_json");
      let list = [];
      try {
        list = JSON.parse(w?.value || "[]");
      } catch (_) {
        list = [];
      }
      if (!Array.isArray(list)) list = [];
      const out = [];
      for (let i = 0; i < MAX_SLOTS; i++) {
        out.push(i < list.length && list[i] ? String(list[i]) : "");
      }
      return out;
    }

    function writeFilenames(node, list) {
      const w = getWidget(node, "images_json");
      if (!w) return;
      const padded = [];
      for (let i = 0; i < MAX_SLOTS; i++) {
        padded.push(i < list.length && list[i] ? String(list[i]) : "");
      }
      w.value = JSON.stringify(padded);
      if (w.callback) w.callback(w.value, app.canvas, node);
      node.setDirtyCanvas?.(true, true);
    }

    async function uploadFile(file) {
      const body = new FormData();
      body.append("image", file);
      body.append("overwrite", "true");
      const resp = await api.fetchApi("/upload/image", {
        method: "POST",
        body,
      });
      if (resp.status !== 200) {
        throw new Error(`Upload failed: ${resp.status}`);
      }
      const data = await resp.json();
      return data.name || data.filename || file.name;
    }

    function computeNodeSize(numSlots, currentWidth, cols) {
      const n = Math.max(1, Math.min(MAX_SLOTS, numSlots | 0));
      const c = Math.max(2, Math.min(4, cols | 0 || 2));
      const rows = Math.ceil(n / c);
      const w = currentWidth && currentWidth > 200 ? currentWidth : NODE_WIDTH;
      let cell = Math.floor((w - GRID_PAD * 2 - GAP * (c - 1)) / c);
      cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
      const gridH = rows * cell + (rows - 1) * GAP + GRID_PAD * 2;
      return [w, CONTROLS_HEIGHT + gridH];
    }

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated?.apply(this, arguments);

      this._slots = [];
      this._slotLabels = [];
      this._previewImgs = [];
      this._placeholders = [];
      this._cropBtns = [];
      this._gridContainer = null;
      this._gridWidget = null;
      this._activeCount = 10;
      this._autoSizing = false;

      injectCropCSS();
      this._hideJsonWidget();
      this._hideCropWidget();
      this._hideSettingsWidgets();
      this._placeGearBesideSlots();
      this._buildGrid();

      const numW = getWidget(this, "num_slots");
      if (numW) numW.label = "Number of Slots";
      const n = numW ? parseInt(numW.value, 10) || 10 : 10;
      this._activeCount = n;
      this._resizeToSlots(n, true);
      this._applySlotCount(false);
      this._applyIndexStyle();
      this._syncAllPreviews();
      this._updateAllCropBtnStates();
      this._syncOutputs();

      const origConnect = this.onConnectionsChange;
      this.onConnectionsChange = function () {
        const r = origConnect?.apply(this, arguments);
        this._syncOutputs();
        return r;
      };

      if (numW) {
        const origCb = numW.callback;
        numW.callback = (value, canvas, node) => {
          if (origCb) origCb.call(numW, value, canvas, node);
          this._applySlotCount(true);
        };
      }

      const styleW = getWidget(this, "index_style");
      if (styleW) {
        const origStyleCb = styleW.callback;
        styleW.callback = (value, canvas, node) => {
          if (origStyleCb) origStyleCb.call(styleW, value, canvas, node);
          this._applyIndexStyle();
        };
      }

      const origOnResize = this.onResize;
      this.onResize = function (size) {
        if (this._autoSizing) {
          return origOnResize?.apply(this, arguments);
        }
        const r2 = origOnResize?.apply(this, arguments);
        if (this._gridWidget) {
          const n2 = this._activeCount || 10;
          const rows = Math.ceil(n2 / 2);
          let cell = Math.floor(
            ((size?.[0] || NODE_WIDTH) - GRID_PAD * 2 - GAP) / 2
          );
          cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
          const gridH = rows * cell + (rows - 1) * GAP + GRID_PAD * 2;
          this._gridWidget.computedHeight = gridH;
        }
        this._updateGridSize();
        return r2;
      };

      const origOnConfigure = this.onConfigure;
      this.onConfigure = function (info) {
        const r3 = origOnConfigure?.apply(this, arguments);
        this._migrateOutputOrder(info);
        this._syncOutputs();
        setTimeout(() => {
          this._hideJsonWidget();
          this._hideCropWidget();
          this._hideSettingsWidgets();
          const numW2 = getWidget(this, "num_slots");
          if (numW2) numW2.label = "Number of Slots";
          this._placeGearBesideSlots();
          const n2 = numW2 ? parseInt(numW2.value, 10) || 10 : 10;
          this._activeCount = n2;
          this._applySlotCount(false);
          this._resizeToSlots(n2, true);
          this._applyIndexStyle();
          this._applyLayoutWidth();
          this._syncAllPreviews();
          this._updateAllCropBtnStates();
          this._syncOutputs();
        }, 40);
        return r3;
      };

      setTimeout(() => {
        this._hideJsonWidget();
        this._hideCropWidget();
        this._hideSettingsWidgets();
        const numW3 = getWidget(this, "num_slots");
        if (numW3) numW3.label = "Number of Slots";
        this._placeGearBesideSlots();
        const n3 = numW3 ? parseInt(numW3.value, 10) || 10 : 10;
        this._resizeToSlots(n3, true);
        this._applySlotCount(false);
        this._applyIndexStyle();
        this._applyLayoutWidth();
        this._syncAllPreviews();
        this._updateAllCropBtnStates();
        this._syncOutputs();
      }, 80);

      return r;
    };

    nodeType.prototype._hideCropWidget = function () {
      const w = getWidget(this, HIDDEN_INPUT_NAME);
      if (!w) return;
      w.computeSize = () => [0, -4];
      w.computedHeight = 0;
      w.hidden = true;
      w.draw = () => {};
      if (w.element) w.element.style.display = "none";
    };

    nodeType.prototype._applyIndexStyle = function () {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const labelEl = this._slotLabels[i];
        if (labelEl) labelEl.textContent = slotLabel(this, i);
      }
      nameOutputs(this);
      this.setDirtyCanvas?.(true, true);
    };

    nodeType.prototype._resizeToSlots = function (numSlots, force) {
      const n = Math.max(1, Math.min(MAX_SLOTS, numSlots | 0));
      const cols = getLayoutWidth(this);
      const width = this.size?.[0] || NODE_WIDTH;
      const [w, h] = computeNodeSize(n, width, cols);

      this._autoSizing = true;
      try {
        if (this._gridWidget) {
          const rows = Math.ceil(n / cols);
          let cell = Math.floor((w - GRID_PAD * 2 - GAP * (cols - 1)) / cols);
          cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
          const gridH = rows * cell + (rows - 1) * GAP + GRID_PAD * 2;
          this._gridWidget.computedHeight = gridH;
          this._gridWidget.computeSize = () => [w - 20, gridH];
        }
        if (force || !this.size || Math.abs((this.size[1] || 0) - h) > 4) {
          this.setSize([w, h]);
          this.size = [w, h];
        }
      } finally {
        this._autoSizing = false;
      }
      this._applyLayoutWidth();
      this._updateGridSize();
      this.setDirtyCanvas?.(true, true);
    };

    nodeType.prototype._applyLayoutWidth = function () {
      const cols = getLayoutWidth(this);
      if (this._gridContainer) {
        this._gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      }
    };

    nodeType.prototype._hideSettingsWidgets = function () {
      const names = ["index_style", "megapixels", "upscale_method", "fit_mode", "batch_longest", "layout_width", "multiple"];
      for (const name of names) {
        const w = getWidget(this, name);
        if (!w) continue;
        w.computeSize = () => [0, -4];
        w.computedHeight = 0;
        w.hidden = true;
        w.draw = () => {};
        const els = [w.element, w.inputEl, w.span, w.div, w.dom];
        for (const el of els) {
          if (el?.style) {
            el.style.display = "none";
            el.style.height = "0";
          }
        }
      }
    };

    nodeType.prototype._openSettings = function () {
      const node = this;
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif;";
      const dialog = document.createElement("div");
      dialog.style.cssText = "background:#2a2a2a;border:1px solid #555;border-radius:10px;padding:16px;min-width:340px;max-width:460px;color:#eee;max-height:80vh;overflow:auto;";
      dialog.innerHTML = `<h3 style="margin:0 0 12px;font-size:15px;">Reference Loader Settings</h3>`;

      const groups = [
        { title: "Layout", fields: [
          { name: "layout_width", label: "Layout width", type: "select", options: ["2", "3", "4"] },
          { name: "index_style", label: "Index style", type: "select", options: ["1-based", "0-based"] },
        ]},
        { title: "Image scale", fields: [
          { name: "megapixels", label: "Megapixels (individual)", type: "number", min: 0, max: 16, step: 0.05 },
          { name: "upscale_method", label: "Upscale method", type: "select", options: ["lanczos", "nearest", "bilinear", "bicubic", "area", "nearest-exact"] },
          { name: "fit_mode", label: "Fit mode", type: "select", options: ["keep_aspect", "crop", "stretch", "pad"] },
          { name: "multiple", label: "Multiple", type: "select", options: ["8", "16", "32", "64"] },
        ]},
        { title: "Batch", fields: [
          { name: "batch_longest", label: "Longest side (px, 0=off)", type: "number", min: 0, max: 8192, step: 64 },
        ]},
      ];

      const inputs = {};
      for (const g of groups) {
        const div = document.createElement("div");
        div.style.cssText = "border-top:1px solid #444;margin:10px 0 6px;padding-top:8px;font-size:11px;color:#8ab;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;";
        div.textContent = g.title;
        dialog.appendChild(div);
        for (const f of g.fields) {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin:6px 0;gap:10px;";
          const lab = document.createElement("label");
          lab.textContent = f.label;
          lab.style.cssText = "font-size:12px;flex:1;";
          let el;
          if (f.type === "select") {
            el = document.createElement("select");
            el.style.cssText = "background:#1a1a1a;color:#eee;border:1px solid #555;border-radius:4px;padding:4px 8px;";
            for (const opt of f.options) {
              const o = document.createElement("option");
              o.value = opt;
              o.textContent = opt;
              el.appendChild(o);
            }
          } else {
            el = document.createElement("input");
            el.type = "number";
            el.min = f.min;
            el.max = f.max;
            el.step = f.step;
            el.style.cssText = "width:100px;background:#1a1a1a;color:#eee;border:1px solid #555;border-radius:4px;padding:4px 8px;";
          }
          const w = getWidget(node, f.name);
          if (w) el.value = w.value;
          inputs[f.name] = el;
          row.append(lab, el);
          dialog.appendChild(row);
        }
      }

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:14px;border-top:1px solid #444;padding-top:12px;";
      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.style.cssText = "background:#3a3a3a;color:#eee;border:1px solid #666;border-radius:6px;padding:6px 14px;cursor:pointer;";
      const apply = document.createElement("button");
      apply.textContent = "Apply";
      apply.style.cssText = "background:#3d6eb5;color:#fff;border:1px solid #5BA3F5;border-radius:6px;padding:6px 14px;cursor:pointer;";
      cancel.onclick = () => overlay.remove();
      apply.onclick = () => {
        for (const g of groups) {
          for (const f of g.fields) {
            const w = getWidget(node, f.name);
            if (!w) continue;
            let v = inputs[f.name].value;
            if (f.type === "number") v = f.name === "megapixels" ? parseFloat(v) : parseInt(v, 10);
            w.value = v;
            if (w.callback) w.callback(v, app.canvas, node);
          }
        }
        node._applyIndexStyle();
        node._applyLayoutWidth();
        node._applySlotCount(true);
        node._syncOutputs();
        node.setDirtyCanvas?.(true, true);
        overlay.remove();
      };
      btnRow.append(cancel, apply);
      dialog.appendChild(btnRow);
      overlay.appendChild(dialog);
      overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    };

    nodeType.prototype._placeGearBesideSlots = function () {
      const numW = getWidget(this, "num_slots");
      if (numW) numW.label = "Number of Slots";

      if (this._gearWidget) return;

      const gear = this.addWidget("button", "⚙ Settings", null, () => {
        this._openSettings();
      });
      gear.serialize = false;
      this._gearWidget = gear;

      // Place the button immediately after Number of Slots
      if (this.widgets && numW) {
        const from = this.widgets.indexOf(gear);
        const to = this.widgets.indexOf(numW);
        if (from > -1 && to > -1 && from !== to + 1) {
          this.widgets.splice(from, 1);
          this.widgets.splice(to + 1, 0, gear);
        }
      }
    };

    nodeType.prototype._migrateOutputOrder = function (savedInfo) {
      if (this._rilOrderMigrated && savedInfo == null) return;
      const saved = savedInfo?.outputs;
      const savedOld = isLegacyOutputOrder(saved);
      const liveOld = isLegacyOutputOrder(this.outputs);
      if (!savedOld && !liveOld) {
        if (savedInfo || slotTitle(this.outputs?.[0]).includes("orig")) {
          this._rilOrderMigrated = true;
        }
        return;
      }
      if (liveOld) {
        const live = this.outputs;
        this.outputs = [live[MAX_SLOTS + 1], live[MAX_SLOTS], ...live.slice(0, MAX_SLOTS)];
      } else if (savedOld && this.outputs && this.outputs.length >= MAX_SLOTS + 2) {
        const assign = (newIdx, oldIdx) => {
          const dst = this.outputs[newIdx];
          if (!dst) return;
          const srcLinks = saved[oldIdx]?.links;
          dst.links = srcLinks
            ? Array.isArray(srcLinks)
              ? srcLinks.slice()
              : Array.from(srcLinks)
            : null;
        };
        assign(ORIG_SLOT, MAX_SLOTS + 1);
        assign(BATCH_SLOT, MAX_SLOTS);
        for (let i = 0; i < MAX_SLOTS; i++) assign(IMAGE_SLOT0 + i, i);
      }
      for (let i = 0; i < this.outputs.length; i++) {
        if (this.outputs[i]) this.outputs[i].slot_index = i;
      }
      this._rilOrderMigrated = true;
      this._rilNeedsLinkFix = true;
      this._fixLinkSlots();
    };

    nodeType.prototype._fixLinkSlots = function () {
      if (!this._rilNeedsLinkFix || !this.outputs || !this.graph?.links) return;
      const links = this.graph.links;
      const slotByLinkId = new Map();
      const ourIds = [];
      for (let i = 0; i < this.outputs.length; i++) {
        const ls = this.outputs[i]?.links;
        if (!ls) continue;
        for (const id of ls) {
          slotByLinkId.set(Number(id), i);
          slotByLinkId.set(String(id), i);
          ourIds.push(Number(id));
        }
      }
      const found = new Set();
      const visit = (link) => {
        if (!link) return;
        const origin = Array.isArray(link) ? link[1] : link.origin_id ?? link.originId;
        if (String(origin) !== String(this.id)) return;
        const rawId = Array.isArray(link) ? link[0] : link.id;
        const slot = slotByLinkId.has(Number(rawId))
          ? slotByLinkId.get(Number(rawId))
          : slotByLinkId.get(String(rawId));
        if (slot === undefined) return;
        if (Array.isArray(link)) link[2] = slot;
        else link.origin_slot = slot;
        found.add(Number(rawId));
      };
      if (typeof links.forEach === "function" && !Array.isArray(links)) links.forEach(visit);
      else if (typeof links.values === "function") {
        for (const link of links.values()) visit(link);
      } else if (Array.isArray(links)) {
        for (const link of links) visit(link);
      } else {
        for (const key of Object.keys(links)) visit(links[key]);
      }
      if (!ourIds.length || ourIds.every((id) => found.has(id))) this._rilNeedsLinkFix = false;
    };

    nodeType.prototype._syncOutputs = function () {
      if (this._rilSyncing) return;
      if (!this.outputs || this.outputs.length < 2) return;
      this._rilSyncing = true;
      try {
        if (!this._rilOrderMigrated) this._migrateOutputOrder(null);
        this._fixLinkSlots();

        // Image 1 and 2 always. The next image socket appears only after the
        // previous one is connected. Slot count does not reveal outputs.
        // The new UI ignores output.hidden, so extra sockets are removed.
        let lastImage = 1;
        const present = Math.min(MAX_SLOTS, Math.max(0, this.outputs.length - IMAGE_SLOT0));
        for (let i = 0; i < present; i++) {
          const links = this.outputs[IMAGE_SLOT0 + i]?.links;
          if (links && links.length) {
            lastImage = Math.max(lastImage, Math.min(MAX_SLOTS - 1, i + 1));
          }
        }
        const targetLen = IMAGE_SLOT0 + lastImage + 1;

        let guard = 0;
        while (this.outputs.length > targetLen && guard++ < MAX_SLOTS + 2) {
          const idx = this.outputs.length - 1;
          const links = this.outputs[idx]?.links;
          if (links && links.length) break;
          const before = this.outputs.length;
          if (typeof this.removeOutput === "function") this.removeOutput(idx);
          if (this.outputs.length >= before) {
            this.outputs.splice(targetLen);
            break;
          }
        }

        guard = 0;
        while (
          this.outputs.length < targetLen &&
          this.outputs.length < IMAGE_SLOT0 + MAX_SLOTS &&
          guard++ < MAX_SLOTS + 2
        ) {
          const imageIndex = this.outputs.length - IMAGE_SLOT0;
          const before = this.outputs.length;
          if (typeof this.addOutput === "function") {
            this.addOutput(imageOutputName(this, imageIndex), "IMAGE");
          } else {
            this.outputs.push({
              name: imageOutputName(this, imageIndex),
              type: "IMAGE",
              links: null,
            });
          }
          if (this.outputs.length === before) break;
        }

        for (let i = 0; i < this.outputs.length; i++) {
          const o = this.outputs[i];
          if (!o) continue;
          o.hidden = i >= targetLen;
          if (o.slot_index !== undefined) o.slot_index = i;
        }
        nameOutputs(this);
        this._installHiddenOutputDraw();
        this.setDirtyCanvas?.(true, true);
        this.graph?.setDirtyCanvas?.(true, true);
      } finally {
        this._rilSyncing = false;
      }
    };

    nodeType.prototype._installHiddenOutputDraw = function () {
      if (nodeType.prototype._rilDrawPatched) return;
      nodeType.prototype._rilDrawPatched = true;

      // drawNode lives on LGraphNode, not this node type
      let proto = nodeType.prototype;
      while (proto && typeof proto.drawNode !== "function") {
        proto = Object.getPrototypeOf(proto);
      }
      if (!proto || typeof proto.drawNode !== "function") return;

      const origDrawNode = proto.drawNode;
      proto.drawNode = function () {
        const isOurs = this?.comfyClass === NODE_NAME || this?.type === NODE_NAME;
        const full = this.outputs;
        if (!isOurs || !full || !full.some((o) => o && o.hidden)) {
          return origDrawNode.apply(this, arguments);
        }
        this.outputs = full.filter((o) => o && !o.hidden);
        try {
          return origDrawNode.apply(this, arguments);
        } finally {
          this.outputs = full;
        }
      };

      if (typeof proto.getConnectionPos === "function") {
        const origPos = proto.getConnectionPos;
        proto.getConnectionPos = function (isInput, slot) {
          const isOurs = this?.comfyClass === NODE_NAME || this?.type === NODE_NAME;
          if (!isOurs || isInput || !this.outputs || !this.outputs.some((o) => o && o.hidden)) {
            return origPos.apply(this, arguments);
          }
          let visual = 0;
          for (let i = 0; i < slot && i < this.outputs.length; i++) {
            if (!this.outputs[i]?.hidden) visual++;
          }
          const full = this.outputs;
          this.outputs = full.filter((o) => o && !o.hidden);
          try {
            return origPos.call(this, isInput, visual);
          } finally {
            this.outputs = full;
          }
        };
      }

      if (typeof proto.computeSize === "function") {
        const origSize = proto.computeSize;
        proto.computeSize = function () {
          const isOurs = this?.comfyClass === NODE_NAME || this?.type === NODE_NAME;
          const full = this.outputs;
          if (!isOurs || !full || !full.some((o) => o && o.hidden)) {
            return origSize.apply(this, arguments);
          }
          this.outputs = full.filter((o) => o && !o.hidden);
          try {
            return origSize.apply(this, arguments);
          } finally {
            this.outputs = full;
          }
        };
      }
    };

    nodeType.prototype._hideJsonWidget = function () {
      const w = getWidget(this, "images_json");
      if (!w) return;
      w.computeSize = () => [0, -4];
      w.computedHeight = 0;
      w.hidden = true;
      const els = [w.element, w.inputEl, w.span, w.div, w.dom];
      for (const el of els) {
        if (el?.style) {
          el.style.display = "none";
          el.style.height = "0";
          el.style.margin = "0";
          el.style.padding = "0";
          el.style.overflow = "hidden";
        }
      }
      if (w.element?.parentElement?.style) {
        const p = w.element.parentElement;
        p.style.display = "none";
        p.style.height = "0";
      }
    };

    nodeType.prototype._buildGrid = function () {
      if (this._gridContainer) return;

      const container = document.createElement("div");
      container.className = "ref-loader-10-grid";
      container.style.cssText = `
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: ${GAP}px;
                width: 100%;
                height: 100%;
                padding: ${GRID_PAD / 2}px;
                box-sizing: border-box;
                background: #1a1a1a;
                border-radius: 6px;
                overflow: hidden;
                align-content: start;
            `;

      for (let i = 1; i <= MAX_SLOTS; i++) {
        container.appendChild(this._createSlot(i));
      }

      const domWidget = this.addDOMWidget("ref_grid", "div", container, {
        serialize: false,
      });

      domWidget.computeSize = () => {
        const n = this._activeCount || 10;
        const cols = getLayoutWidth(this);
        const rows = Math.ceil(n / cols);
        const width = this.size?.[0] || NODE_WIDTH;
        let cell = Math.floor((width - GRID_PAD * 2 - GAP * (cols - 1)) / cols);
        cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
        const gridH = rows * cell + (rows - 1) * GAP + GRID_PAD * 2;
        return [width - 20, gridH];
      };
      const n0 = this._activeCount || 10;
      const rows0 = Math.ceil(n0 / 2);
      let cell0 = Math.floor((NODE_WIDTH - GRID_PAD * 2 - GAP) / 2);
      cell0 = Math.max(MIN_CELL, Math.min(MAX_CELL, cell0));
      domWidget.computedHeight =
        rows0 * cell0 + (rows0 - 1) * GAP + GRID_PAD * 2;

      this._gridWidget = domWidget;
      this._gridContainer = container;
      this._updateGridSize();
    };

    nodeType.prototype._createSlot = function (index) {
      const slot = document.createElement("div");
      slot.className = "ref-slot";
      slot.dataset.idx = index;
      slot.style.cssText = `
                display: flex;
                flex-direction: column;
                background: #252525;
                border: 1px solid #3a3a3a;
                border-radius: 5px;
                overflow: hidden;
                min-height: 0;
                position: relative;
                transition: border-color 0.15s, background 0.15s, opacity 0.15s;
                aspect-ratio: 1 / 1;
            `;
      this._slots[index - 1] = slot;

      const header = document.createElement("div");
      header.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 2px 6px; background: #2e2e2e; flex-shrink: 0;
                font-size: 11px; font-weight: 600; color: #bbb; user-select: none;
            `;

      const left = document.createElement("div");
      left.style.cssText = "display:flex;align-items:center;gap:2px;min-width:0;";

      // Drag handle — grab to reorder slots
      const handle = document.createElement("span");
      handle.className = "ril-slot-handle";
      handle.textContent = "⠿";
      handle.title = "Drag to reorder slots";
      handle.draggable = true;
      left.appendChild(handle);

      const label = document.createElement("span");
      label.textContent = `Image ${index}`;
      left.appendChild(label);
      header.appendChild(left);
      this._slotLabels[index - 1] = label;

      const clearBtn = document.createElement("button");
      clearBtn.textContent = "×";
      clearBtn.title = "Clear slot";
      clearBtn.style.cssText = `
                background: transparent; border: none; color: #888;
                font-size: 14px; line-height: 1; cursor: pointer; padding: 0 2px;
            `;
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._clearSlot(index);
        setSlotCrop(this, index - 1, null);
        this._updateCropBtnState(index - 1);
      });
      header.appendChild(clearBtn);
      slot.appendChild(header);

      // --- Reorder drag from handle ---
      handle.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-ril-slot", String(index));
        // Fallback for some browsers
        e.dataTransfer.setData("text/plain", `ril-slot:${index}`);
        slot.classList.add("ril-dragging");
        this._rilDragFrom = index;
      });
      handle.addEventListener("dragend", () => {
        slot.classList.remove("ril-dragging");
        this._rilDragFrom = null;
        for (const s of this._slots || []) {
          if (s) s.classList.remove("ril-drop-target");
        }
      });

      const preview = document.createElement("div");
      preview.className = "ril-slot-preview";
      preview.style.cssText = `
                flex: 1; display: flex; align-items: center; justify-content: center;
                background: #111; overflow: hidden; position: relative;
                min-height: 40px; cursor: pointer;
            `;

      // Crop button overlaid top-left of the preview
      const cropBtn = document.createElement("button");
      cropBtn.className = "ril-slot-crop-btn";
      cropBtn.textContent = "Crop";
      cropBtn.title = "Crop this image";
      cropBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this._openSlotCrop(index);
      });
      preview.appendChild(cropBtn);
      this._cropBtns[index - 1] = cropBtn;

      const img = document.createElement("img");
      img.style.cssText = `
                max-width: 100%; max-height: 100%; object-fit: contain;
                display: none; pointer-events: none;
            `;
      preview.appendChild(img);
      this._previewImgs[index - 1] = img;

      const placeholder = document.createElement("div");
      placeholder.textContent = "Drop / Click";
      placeholder.style.cssText = `
                color: #555; font-size: 11px; text-align: center;
                pointer-events: none; padding: 4px;
            `;
      preview.appendChild(placeholder);
      this._placeholders[index - 1] = placeholder;

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) await this._handleFile(index, file);
        fileInput.value = "";
      });
      slot.appendChild(fileInput);

      preview.addEventListener("click", (e) => {
        if (e.target === cropBtn) return;
        e.stopPropagation();
        fileInput.click();
      });

      // Shared drop target logic on the whole slot (header + preview)
      const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const types = e.dataTransfer?.types || [];
        const isReorder =
          types.includes("application/x-ril-slot") ||
          (this._rilDragFrom != null && this._rilDragFrom !== index);
        if (isReorder) {
          e.dataTransfer.dropEffect = "move";
          slot.classList.add("ril-drop-target");
        } else if (types.includes("Files")) {
          e.dataTransfer.dropEffect = "copy";
          slot.style.borderColor = "#5a9";
          slot.style.background = "#2a3a2a";
        }
      };
      const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if leaving the slot entirely
        if (!slot.contains(e.relatedTarget)) {
          slot.classList.remove("ril-drop-target");
          slot.style.borderColor = "#3a3a3a";
          slot.style.background = "#252525";
        }
      };
      const onDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        slot.classList.remove("ril-drop-target");
        slot.style.borderColor = "#3a3a3a";
        slot.style.background = "#252525";

        // Slot reorder?
        let fromIdx = e.dataTransfer?.getData("application/x-ril-slot");
        if (!fromIdx) {
          const plain = e.dataTransfer?.getData("text/plain") || "";
          if (plain.startsWith("ril-slot:")) fromIdx = plain.slice("ril-slot:".length);
        }
        if (!fromIdx && this._rilDragFrom != null) {
          fromIdx = String(this._rilDragFrom);
        }
        if (fromIdx) {
          const from = parseInt(fromIdx, 10);
          if (!isNaN(from) && from >= 1 && from <= MAX_SLOTS && from !== index) {
            this._swapSlots(from, index);
          }
          return;
        }

        // File drop
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith("image/")) {
          await this._handleFile(index, file);
        }
      };

      slot.addEventListener("dragover", onDragOver);
      slot.addEventListener("dragleave", onDragLeave);
      slot.addEventListener("drop", onDrop);

      slot.appendChild(preview);
      return slot;
    };

    /** Swap filenames + crops between two 1-based slot indices, refresh UI. */
    nodeType.prototype._swapSlots = function (fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      const a = fromIndex - 1;
      const b = toIndex - 1;
      if (a < 0 || b < 0 || a >= MAX_SLOTS || b >= MAX_SLOTS) return;

      const names = readFilenames(this);
      const crops = readCrops(this);

      const tmpName = names[a];
      names[a] = names[b];
      names[b] = tmpName;

      const tmpCrop = crops[a];
      crops[a] = crops[b];
      crops[b] = tmpCrop;

      writeFilenames(this, names);
      writeCrops(this, crops);

      this._setPreview(fromIndex, names[a] || null);
      this._setPreview(toIndex, names[b] || null);
      this._updateCropBtnState(a);
      this._updateCropBtnState(b);
      this.setDirtyCanvas?.(true, true);
    };

    nodeType.prototype._updateCropBtnState = function (zeroBasedIndex) {
      const btn = this._cropBtns?.[zeroBasedIndex];
      if (!btn) return;
      const crops = readCrops(this);
      const has = !!crops[zeroBasedIndex];
      btn.classList.toggle("active", has);
      btn.textContent = has ? "Crop ✓" : "Crop";
    };

    nodeType.prototype._updateAllCropBtnStates = function () {
      for (let i = 0; i < MAX_SLOTS; i++) this._updateCropBtnState(i);
    };

    nodeType.prototype._openSlotCrop = async function (index) {
      try {
        const list = readFilenames(this);
        const filename = list[index - 1];
        if (!filename) {
          app.ui?.dialog?.show?.(
            `Load an image into ${slotLabel(this, index - 1)} first.`
          );
          return;
        }
        const url = getPreviewUrl(filename);
        if (!url) {
          app.ui?.dialog?.show?.("Could not load image for crop.");
          return;
        }
        const fullImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = url;
        });
        const crops = readCrops(this);
        const existing = crops[index - 1];
        const result = await openCropModal(
          fullImg,
          existing,
          `Crop ${slotLabel(this, index - 1)}`
        );
        if (result === "cancel") return;
        setSlotCrop(this, index - 1, result);
        this._updateCropBtnState(index - 1);
      } catch (err) {
        console.error("[Tallron ReferenceImageLoader] crop failed", err);
        app.ui?.dialog?.show?.(
          err?.message || "Could not open crop dialog."
        );
      }
    };

    nodeType.prototype._applySlotCount = function (doResize) {
      const w = getWidget(this, "num_slots");
      let n = w ? parseInt(w.value, 10) : 10;
      if (isNaN(n) || n < 1) n = 1;
      if (n > MAX_SLOTS) n = MAX_SLOTS;
      this._activeCount = n;

      for (let i = 0; i < MAX_SLOTS; i++) {
        const slot = this._slots[i];
        if (slot) slot.style.display = i < n ? "flex" : "none";
      }
      if (this._gridContainer) {
        const cols = getLayoutWidth(this);
        this._gridContainer.style.gridTemplateRows = `repeat(${Math.ceil(n / cols)}, 1fr)`;
      }

      if (doResize) {
        this._resizeToSlots(n, true);
      } else {
        this._updateGridSize();
        this.setDirtyCanvas?.(true, true);
      }
      this._syncOutputs();
    };

    nodeType.prototype._handleFile = async function (index, file) {
      try {
        const name = await uploadFile(file);
        const list = readFilenames(this);
        list[index - 1] = name;
        writeFilenames(this, list);
        this._setPreview(index, name);
        setSlotCrop(this, index - 1, null);
        this._updateCropBtnState(index - 1);
      } catch (err) {
        console.error("[TallronReferenceImageLoader] upload failed", err);
        app.ui?.dialog?.show?.(`Upload failed: ${err.message}`);
      }
    };

    nodeType.prototype._clearSlot = function (index) {
      const list = readFilenames(this);
      list[index - 1] = "";
      writeFilenames(this, list);
      this._setPreview(index, null);
    };

    nodeType.prototype._setPreview = function (index, filename) {
      const img = this._previewImgs[index - 1];
      const ph = this._placeholders[index - 1];
      if (!img || !ph) return;

      if (!filename || !String(filename).trim()) {
        img.style.display = "none";
        img.removeAttribute("src");
        ph.style.display = "block";
        return;
      }

      const url = getPreviewUrl(filename);
      if (!url) {
        img.style.display = "none";
        ph.style.display = "block";
        return;
      }

      img.onload = () => {
        img.style.display = "block";
        ph.style.display = "none";
      };
      img.onerror = () => {
        img.style.display = "none";
        ph.style.display = "block";
      };
      img.src = url;
    };

    nodeType.prototype._syncAllPreviews = function () {
      const list = readFilenames(this);
      for (let i = 0; i < MAX_SLOTS; i++) {
        this._setPreview(i + 1, list[i] || null);
      }
    };

    nodeType.prototype._updateGridSize = function () {
      if (this._gridContainer) this._gridContainer.style.height = "100%";
    };
  },
});
