import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "TallronReferenceImageLoader";
const MAX_SLOTS = 10;
const CROP_PROP = "ril_crop";
const HIDDEN_INPUT_NAME = "crop";
const CSS_ID = "tallron-ref-loader-crop-css";

const NODE_WIDTH = 440;
const CONTROLS_HEIGHT = 130;
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

    function isFluxStyle(node) {
      const w = getWidget(node, "index_style");
      const v = (w?.value || "").toString();
      return v.startsWith("Flux");
    }

    function slotLabel(node, zeroBasedIndex) {
      const n = isFluxStyle(node) ? zeroBasedIndex : zeroBasedIndex + 1;
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

    function computeNodeSize(numSlots, currentWidth) {
      const n = Math.max(1, Math.min(MAX_SLOTS, numSlots | 0));
      const rows = Math.ceil(n / 2);
      const w = currentWidth && currentWidth > 200 ? currentWidth : NODE_WIDTH;
      let cell = Math.floor((w - GRID_PAD * 2 - GAP) / 2);
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
      this._buildGrid();

      const numW = getWidget(this, "num_slots");
      const n = numW ? parseInt(numW.value, 10) || 10 : 10;
      this._activeCount = n;
      this._resizeToSlots(n, true);
      this._applySlotCount(false);
      this._applyIndexStyle();
      this._syncAllPreviews();
      this._updateAllCropBtnStates();

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
        setTimeout(() => {
          this._hideJsonWidget();
          this._hideCropWidget();
          const numW2 = getWidget(this, "num_slots");
          const n2 = numW2 ? parseInt(numW2.value, 10) || 10 : 10;
          this._activeCount = n2;
          this._applySlotCount(false);
          this._resizeToSlots(n2, true);
          this._applyIndexStyle();
          this._syncAllPreviews();
          this._updateAllCropBtnStates();
        }, 40);
        return r3;
      };

      setTimeout(() => {
        this._hideJsonWidget();
        this._hideCropWidget();
        const numW3 = getWidget(this, "num_slots");
        const n3 = numW3 ? parseInt(numW3.value, 10) || 10 : 10;
        this._resizeToSlots(n3, true);
        this._applySlotCount(false);
        this._applyIndexStyle();
        this._syncAllPreviews();
        this._updateAllCropBtnStates();
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
      const flux = isFluxStyle(this);
      for (let i = 0; i < MAX_SLOTS; i++) {
        const labelEl = this._slotLabels[i];
        if (labelEl) labelEl.textContent = slotLabel(this, i);
      }
      if (this.outputs && this.outputs.length >= 10) {
        for (let i = 0; i < 10; i++) {
          const name = flux ? `Image ${i}` : `Image ${i + 1}`;
          this.outputs[i].name = name;
          if (this.outputs[i].localized_name !== undefined) {
            this.outputs[i].localized_name = name;
          }
        }
        if (this.outputs.length >= 12) {
          const fullName = flux ? "Image 0 full size" : "Image 1 full size";
          this.outputs[11].name = fullName;
          if (this.outputs[11].localized_name !== undefined) {
            this.outputs[11].localized_name = fullName;
          }
        }
      }
      this.setDirtyCanvas?.(true, true);
    };

    nodeType.prototype._resizeToSlots = function (numSlots, force) {
      const n = Math.max(1, Math.min(MAX_SLOTS, numSlots | 0));
      const width = this.size?.[0] || NODE_WIDTH;
      const [w, h] = computeNodeSize(n, width);

      this._autoSizing = true;
      try {
        if (this._gridWidget) {
          const rows = Math.ceil(n / 2);
          let cell = Math.floor((w - GRID_PAD * 2 - GAP) / 2);
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
      this._updateGridSize();
      this.setDirtyCanvas?.(true, true);
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
                grid-template-columns: 1fr 1fr;
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
        const rows = Math.ceil(n / 2);
        const width = this.size?.[0] || NODE_WIDTH;
        let cell = Math.floor((width - GRID_PAD * 2 - GAP) / 2);
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
        this._gridContainer.style.gridTemplateRows = `repeat(${Math.ceil(
          n / 2
        )}, 1fr)`;
      }

      if (doResize) {
        this._resizeToSlots(n, true);
      } else {
        this._updateGridSize();
        this.setDirtyCanvas?.(true, true);
      }
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
