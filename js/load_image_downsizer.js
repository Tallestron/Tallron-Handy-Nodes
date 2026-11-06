/**
 * Tallron — Load Image Downsizer
 *
 * Crop dialog stores a normalized box on node.properties.tld_crop and injects
 * it into the hidden Python "crop" input at run time.
 *
 * Node preview is the normal Load Image full-image thumbnail (no crop preview).
 */
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "LoadImageDownsizer";
const CSS_ID = "tallron-load-image-downsizer-css";
const CROP_PROP = "tld_crop";
const HIDDEN_INPUT_NAME = "crop";

function injectCSS() {
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
    .tld-crop-header h3 {
      margin: 0; font-size: 14px; font-weight: 600; color: #fff;
    }
    .tld-crop-header .tld-meta {
      font-size: 12px; color: #aaa; font-variant-numeric: tabular-nums;
    }
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
      width: auto; height: auto;
      pointer-events: none;
    }
    .tld-crop-stage canvas.tld-overlay {
      position: absolute; left: 0; top: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }
    .tld-crop-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-top: 1px solid #444;
      gap: 10px; flex-shrink: 0; flex-wrap: wrap;
    }
    .tld-crop-footer .tld-hint {
      font-size: 11px; color: #888; flex: 1;
    }
    .tld-btn {
      appearance: none; border: 1px solid #666; background: #3a3a3a;
      color: #eee; border-radius: 6px; padding: 6px 14px;
      font-size: 12px; cursor: pointer; font-weight: 500;
    }
    .tld-btn:hover { background: #4a4a4a; border-color: #888; }
    .tld-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .tld-btn.primary {
      background: #3d6eb5; border-color: #5BA3F5; color: #fff;
    }
    .tld-btn.primary:hover { background: #4a7fc4; }
    .tld-btn.danger {
      background: #5a3030; border-color: #a55; color: #fcc;
    }
    .tld-btn.danger:hover { background: #6a3a3a; }
    .tld-node-btns {
      display: flex; gap: 6px; margin: 0; padding: 0; align-items: center;
      flex-wrap: wrap; min-height: 0; line-height: 1;
    }
    .tld-node-btns .tld-btn {
      padding: 4px 10px; font-size: 11px;
    }
    .tld-node-btns .tld-btn.active {
      background: #3d6eb5; border-color: #5BA3F5;
    }
  `;
  document.head.appendChild(style);
}

function getWidget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

function hideWidget(node, name) {
  const w = getWidget(node, name);
  if (!w) return;
  w.computeSize = () => [0, -4];
  w.draw = () => {};
  w.type = "converted-widget";
  if (w.element) w.element.style.display = "none";
}

function parseCropValue(raw) {
  if (!raw || !String(raw).trim()) return null;
  try {
    const d = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      d &&
      typeof d.x === "number" &&
      typeof d.y === "number" &&
      typeof d.w === "number" &&
      typeof d.h === "number" &&
      d.w > 0.001 &&
      d.h > 0.001
    ) {
      return { x: d.x, y: d.y, w: d.w, h: d.h };
    }
  } catch (_) {}
  return null;
}

function readCrop(node) {
  if (!node) return null;
  const fromProp = parseCropValue(node.properties?.[CROP_PROP]);
  if (fromProp) return fromProp;
  const w = getWidget(node, HIDDEN_INPUT_NAME);
  return parseCropValue(w?.value);
}

function writeCrop(node, box) {
  if (!node) return;
  if (!node.properties) node.properties = {};

  if (!box) {
    delete node.properties[CROP_PROP];
    const w = getWidget(node, HIDDEN_INPUT_NAME);
    if (w) w.value = "";
  } else {
    const json = JSON.stringify({
      x: +box.x.toFixed(6),
      y: +box.y.toFixed(6),
      w: +box.w.toFixed(6),
      h: +box.h.toFixed(6),
    });
    node.properties[CROP_PROP] = json;
    const w = getWidget(node, HIDDEN_INPUT_NAME);
    if (w) w.value = json;
  }

  try {
    app.graph?.setDirtyCanvas?.(true, true);
  } catch (_) {}
  node.setDirtyCanvas?.(true, true);
}

function getImageFilename(node) {
  const w = getWidget(node, "image");
  return w?.value ? String(w.value) : null;
}

function getPreviewUrl(filename) {
  if (!filename) return null;
  let name = filename;
  let subfolder = "";
  let type = "input";
  const m = name.match(/^(.*?)(?:\s*\[(input|output|temp)\])?$/i);
  if (m) {
    name = m[1].trim();
    if (m[2]) type = m[2].toLowerCase();
  }
  const slash = name.lastIndexOf("/");
  if (slash >= 0) {
    subfolder = name.slice(0, slash);
    name = name.slice(slash + 1);
  }
  return api.apiURL(
    `/view?filename=${encodeURIComponent(name)}&type=${type}` +
      `&subfolder=${encodeURIComponent(subfolder)}&rand=${Date.now()}`
  );
}

function loadFullImage(node) {
  return new Promise((resolve, reject) => {
    const filename = getImageFilename(node);
    if (!filename) {
      reject(new Error("No image selected"));
      return;
    }
    const url = getPreviewUrl(filename);
    if (!url) {
      reject(new Error("Could not build preview URL"));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function openCropModal(fullImg, existingCrop) {
  return new Promise((resolve) => {
    injectCSS();

    const overlay = document.createElement("div");
    overlay.className = "tld-crop-overlay";

    const dialog = document.createElement("div");
    dialog.className = "tld-crop-dialog";

    const header = document.createElement("div");
    header.className = "tld-crop-header";
    const title = document.createElement("h3");
    title.textContent = "Crop Image";
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

    function onPointerDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const { nx, ny } = clientToNatural(e.clientX, e.clientY);

      if (
        box &&
        nx >= box.x &&
        nx <= box.x + box.w &&
        ny >= box.y &&
        ny <= box.y + box.h
      ) {
        mode = "move";
        originBox = { ...box };
        startNx = nx;
        startNy = ny;
      } else {
        mode = "draw";
        startNx = nx;
        startNy = ny;
        box = { x: nx, y: ny, w: 0, h: 0 };
      }
      dragging = true;
      stage.setPointerCapture?.(e.pointerId);
      drawOverlay();
    }

    function onPointerMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const { nx, ny } = clientToNatural(e.clientX, e.clientY);

      if (mode === "draw") {
        const x0 = Math.min(startNx, nx);
        const y0 = Math.min(startNy, ny);
        const x1 = Math.max(startNx, nx);
        const y1 = Math.max(startNy, ny);
        box = {
          x: x0,
          y: y0,
          w: Math.max(0, x1 - x0),
          h: Math.max(0, y1 - y0),
        };
      } else if (mode === "move" && originBox) {
        const dx = nx - startNx;
        const dy = ny - startNy;
        let nx0 = originBox.x + dx;
        let ny0 = originBox.y + dy;
        nx0 = Math.max(0, Math.min(1 - originBox.w, nx0));
        ny0 = Math.max(0, Math.min(1 - originBox.h, ny0));
        box = { x: nx0, y: ny0, w: originBox.w, h: originBox.h };
      }
      drawOverlay();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      mode = null;
      if (box && (box.w < 0.005 || box.h < 0.005)) {
        box = existingCrop ? { ...existingCrop } : null;
      }
      drawOverlay();
    }

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);

    imgEl.onload = () => requestAnimationFrame(drawOverlay);
    if (imgEl.complete) requestAnimationFrame(drawOverlay);
    window.addEventListener("resize", drawOverlay);

    function close(result) {
      window.removeEventListener("resize", drawOverlay);
      overlay.remove();
      resolve(result);
    }

    btnApply.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!box || box.w < 0.001 || box.h < 0.001) {
        close(null);
        return;
      }
      close({ ...box });
    });
    btnCancel.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close("cancel");
    });
    btnClear.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      box = null;
      drawOverlay();
      close(null);
    });

    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("cancel");
      } else if (e.key === "Enter") {
        e.preventDefault();
        btnApply.click();
      }
    });
    overlay.tabIndex = 0;
    overlay.focus();

    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close("cancel");
    });
  });
}

// ── Prompt injection for hidden crop input ──

function buildDownsizerNodeIndex() {
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

function findDownsizerNode(index, promptId) {
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
  try {
    const out = result?.output;
    if (out) {
      let index = null;
      for (const id in out) {
        const entry = out[id];
        if (!entry || entry.class_type !== NODE_NAME) continue;
        if (!index) index = buildDownsizerNodeIndex();
        const node = findDownsizerNode(index, id);
        entry.inputs = entry.inputs || {};
        const raw = node?.properties?.[CROP_PROP] || "";
        entry.inputs[HIDDEN_INPUT_NAME] = raw;
        entry.inputs.crop = raw;
      }
    }
  } catch (e) {
    console.error(
      "[Tallron] LoadImageDownsizer prompt injection failed; prompt sent unchanged",
      e
    );
  }
  return result;
};

app.registerExtension({
  name: "Tallron.LoadImageDownsizer",

  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated?.apply(this, arguments);

      injectCSS();
      hideWidget(this, HIDDEN_INPUT_NAME);
      if (!this.properties) this.properties = {};

      const btnHost = document.createElement("div");
      btnHost.className = "tld-node-btns";

      const cropBtn = document.createElement("button");
      cropBtn.className = "tld-btn";
      cropBtn.textContent = "Crop";
      cropBtn.title = "Open crop dialog — drag a box on the image";

      const clearCropBtn = document.createElement("button");
      clearCropBtn.className = "tld-btn danger";
      clearCropBtn.textContent = "Clear crop";
      clearCropBtn.title = "Remove crop (outputs use full image again)";

      const updateBtnState = () => {
        const has = !!readCrop(this);
        cropBtn.classList.toggle("active", has);
        cropBtn.textContent = has ? "Crop ✎" : "Crop";
        clearCropBtn.style.display = has ? "" : "none";
      };
      this._tldUpdateBtnState = updateBtnState;

      cropBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const fullImg =
            this._tldFullImg && this._tldFullImg.naturalWidth
              ? this._tldFullImg
              : await loadFullImage(this);
          this._tldFullImg = fullImg;
          const existing = readCrop(this);
          const result = await openCropModal(fullImg, existing);
          if (result === "cancel") return;
          writeCrop(this, result);
          // Preview stays the full image; crop only affects outputs
          updateBtnState();
        } catch (err) {
          console.error("[Tallron LoadImageDownsizer] crop failed", err);
          app.ui?.dialog?.show?.(
            err?.message || "Could not open crop dialog. Select an image first."
          );
        }
      });

      clearCropBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        writeCrop(this, null);
        updateBtnState();
      });

      btnHost.append(cropBtn, clearCropBtn);

      const btnWidget = this.addDOMWidget?.(
        "tld_crop_btns",
        "TLD_CROP_BTNS",
        btnHost,
        { serialize: false, hideOnZoom: false }
      );
      if (btnWidget) {
        btnWidget.computeSize = () => [
          Math.max(120, (this.size?.[0] || 280) - 20),
          28,
        ];
      }

      const imgWidget = getWidget(this, "image");
      if (imgWidget) {
        const prevCb = imgWidget.callback;
        imgWidget.callback = (...args) => {
          this._tldFullImg = null;
          const ret =
            typeof prevCb === "function"
              ? prevCb.apply(imgWidget, args)
              : undefined;
          setTimeout(() => updateBtnState(), 50);
          return ret;
        };
      }

      updateBtnState();
      setTimeout(() => updateBtnState(), 100);

      return r;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const r = onConfigure?.apply(this, arguments);
      setTimeout(() => this._tldUpdateBtnState?.(), 150);
      return r;
    };
  },
});
