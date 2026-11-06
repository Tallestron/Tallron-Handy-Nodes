import { app } from "../../scripts/app.js";

console.log("[Tallron] Image Compare JS loaded");

// --- Self-contained stubs (no external shared package) ---
const ACCENT = "#5BA3F5"; // Tallron light blue

function isVueNodes() {
  return !!(window.LiteGraph?.vueNodesMode);
}

function installCanvasZoomPassthrough(el) {
  if (!el) return;
  el.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
}

function applyAdaptiveCanvasOnly(widget) {
  if (widget) widget.canvasOnly = false;
}

function accentOf(_node) {
  return ACCENT;
}
// --- end stubs ---

let _acc = ACCENT;

const MODES = ["Left Right", "Right Left", "Up Down", "Overlay", "Difference"];
const SLIDER_PAD = 50;
const MODE_HINTS = [
  "↔  Hover to slide left / right",
  "↔  Hover to slide right / left",
  "↕  Hover to slide up / down",
  "",
  "Shows pixel differences",
];

const BTN_GAP = 3;
const BTN_H = 18;
const BTN_W = 56;
const BTN_X = 80;
const ROW1_Y = 10;
const ROW2_Y = 30;
const IMG_Y = 54;
const INIT_W = 440;
const INIT_H = INIT_W + IMG_Y;
const MIN_W = BTN_X + BTN_W * 6 + BTN_GAP * 5 + 6;
const MIN_H = IMG_Y + 100;

function rowLayout(W) {
  const gap = BTN_GAP;
  const vue = isVueNodes();
  const leftPad = vue ? 12 : BTN_X;
  const rightPad = vue ? 12 : 6;
  const n = 6;
  let bw = Math.floor((W - leftPad - rightPad - gap * (n - 1)) / n);
  bw = Math.max(30, vue ? bw : Math.min(BTN_W, bw));
  return { leftPad, gap, bw };
}
function showRect(W) {
  const L = rowLayout(W);
  return { x: L.leftPad, y: ROW1_Y, w: L.bw, h: BTN_H };
}
function modeRect(W, i) {
  const L = rowLayout(W);
  return { x: L.leftPad + (i + 1) * (L.bw + L.gap), y: ROW1_Y, w: L.bw, h: BTN_H };
}

const SIZE_FONT = "12px 'Segoe UI',sans-serif";
const BADGE_R = 8;
const BADGE_FONT = "10px 'Segoe UI',sans-serif";
const SIZE_RESERVE = 86;
const SIZE_GAP = 6;

function dimsText(img) {
  return img ? `${img.naturalWidth}×${img.naturalHeight}` : "";
}
function sizesDiffer(node) {
  const a = node?._cmpImg1, b = node?._cmpImg2;
  if (!a || !b) return false;
  return a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight;
}
function row2Full(W) {
  const L = rowLayout(W);
  return { x: L.leftPad, y: ROW2_Y, w: L.bw * 6 + L.gap * 5, h: BTN_H };
}
function row2Mid(node, W) {
  const full = row2Full(W);
  const resL = node?._cmpImg1 ? SIZE_RESERVE + SIZE_GAP : 0;
  const resR = node?._cmpImg2 ? SIZE_RESERVE + SIZE_GAP : 0;
  const x = full.x + resL;
  const w = Math.max(40, full.w - resL - resR);
  return { x, y: ROW2_Y, w, h: BTN_H };
}
function utilBtnRects(node, W) {
  const mid = row2Mid(node, W);
  const bw = Math.floor((mid.w - BTN_GAP * 2) / 3);
  return [0, 1, 2].map((i) => ({ x: mid.x + i * (bw + BTN_GAP), y: ROW2_Y, w: bw, h: BTN_H }));
}
function diskRect(node, W) { return utilBtnRects(node, W)[0]; }
function saveRect(node, W) { return utilBtnRects(node, W)[1]; }
function copyRect(node, W) { return utilBtnRects(node, W)[2]; }
function sliderGeo(node, W) {
  const mid = row2Mid(node, W);
  const trackX = mid.x + SLIDER_PAD;
  const trackW = Math.max(20, mid.w - SLIDER_PAD - 36);
  const trackY = mid.y + mid.h / 2 - 3;
  const trackH = 6;
  return { trackX, trackW, trackY, trackH };
}

function cmpCursor(node, lx, ly, W, H) {
  const p = [lx, ly];
  if (inside(p, showRect(W))) return "pointer";
  for (let i = 0; i < 5; i++) if (inside(p, modeRect(W, i))) return "pointer";
  if (node._cmpShowWhich !== 0 &&
      (inside(p, saveRect(node, W)) || inside(p, diskRect(node, W)) || inside(p, copyRect(node, W)))) return "pointer";
  if (node._cmpShowWhich === 0 && node._cmpMode === 3) {
    const g = sliderGeo(node, W);
    if (lx >= g.trackX - 8 && lx <= g.trackX + g.trackW + 8 &&
        ly >= g.trackY - 6 && ly <= g.trackY + g.trackH + 6) return "pointer";
  }
  if (ly >= IMG_Y && node._cmpShowWhich === 0 && (node._cmpImg1 || node._cmpImg2)) {
    if (node._cmpMode <= 1) return "ew-resize";
    if (node._cmpMode === 2) return "ns-resize";
  }
  return "default";
}
function inside(pos, r) {
  return (
    pos[0] >= r.x && pos[0] <= r.x + r.w && pos[1] >= r.y && pos[1] <= r.y + r.h
  );
}

const MODE_TIPS = [
  "Split view. Hover the image to wipe between the two, left to right.",
  "Split view with the sides swapped. Hover to wipe right to left.",
  "Split view. Hover the image to wipe top to bottom.",
  "Overlay the two images. Drag the slider to fade between them.",
  "Show only the pixels that differ between the two images.",
];
function cmpTooltipFor(node, lx, ly, W) {
  const p = [lx, ly];
  if (inside(p, showRect(W)))
    return "Show one image full-size. Click to switch between image 1 and 2.";
  for (let i = 0; i < 5; i++) if (inside(p, modeRect(W, i))) return MODE_TIPS[i];
  if (node._cmpShowWhich !== 0) {
    const n = node._cmpShowWhich;
    if (inside(p, diskRect(node, W))) return `Save image ${n} to your disk (choose where).`;
    if (inside(p, saveRect(node, W))) return `Download image ${n} as PNG.`;
    if (inside(p, copyRect(node, W))) return `Copy image ${n} to the clipboard.`;
  }
  return "";
}
let _cmpTipEl = null, _cmpTipTimer = null, _cmpTipText = null, _cmpTipX = 0, _cmpTipY = 0;
function cmpTipDiv() {
  if (_cmpTipEl) return _cmpTipEl;
  const d = document.createElement("div");
  d.style.cssText =
    "position:fixed;z-index:99999;pointer-events:none;display:none;white-space:nowrap;" +
    "background:#ffffff;color:#000000;border:1px solid #767676;" +
    "border-radius:0;padding:3px 7px;font:12px 'Segoe UI',sans-serif;" +
    "box-shadow:0 2px 4px rgba(0,0,0,0.15);";
  document.body.appendChild(d);
  _cmpTipEl = d;
  return d;
}
function cmpPositionTip(x, y) {
  const d = _cmpTipEl;
  if (!d || d.style.display !== "block") return;
  let nx = x + 14, ny = y + 18;
  const r = d.getBoundingClientRect();
  if (nx + r.width > window.innerWidth - 4) nx = window.innerWidth - r.width - 4;
  if (ny + r.height > window.innerHeight - 4) ny = y - r.height - 8;
  d.style.left = `${Math.max(4, nx)}px`;
  d.style.top = `${Math.max(4, ny)}px`;
}
function cmpShowTooltip(text, x, y) {
  if (!text) { cmpHideTooltip(); return; }
  _cmpTipX = x; _cmpTipY = y;
  if (text === _cmpTipText) return;
  _cmpTipText = text;
  clearTimeout(_cmpTipTimer);
  if (_cmpTipEl) _cmpTipEl.style.display = "none";
  _cmpTipTimer = setTimeout(() => {
    const d = cmpTipDiv();
    d.textContent = text;
    d.style.display = "block";
    cmpPositionTip(_cmpTipX, _cmpTipY);
  }, 450);
}
function cmpHideTooltip() {
  clearTimeout(_cmpTipTimer);
  _cmpTipText = null;
  if (_cmpTipEl) _cmpTipEl.style.display = "none";
}

function paintBtn(ctx, r, label, on, hovered) {
  ctx.fillStyle = on ? _acc : "#2a2c2e";
  ctx.strokeStyle = on ? _acc : (hovered ? _acc : "#444");
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 3);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = on ? "#fff" : (hovered ? "#ddd" : "#999");
  ctx.font = "9px 'Segoe UI',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

function paintUtilBtn(ctx, r, label, hover, flash) {
  ctx.save();
  ctx.fillStyle = flash ? "#3ec371" : "#2a2c2e";
  ctx.strokeStyle = flash ? "#3ec371" : (hover ? _acc : "#444");
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 3);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = flash ? "#fff" : (hover ? "#ddd" : "#999");
  let fs = 9;
  ctx.font = `${fs}px 'Segoe UI',sans-serif`;
  while (fs > 7 && ctx.measureText(label).width > r.w - 8) {
    fs -= 0.5;
    ctx.font = `${fs}px 'Segoe UI',sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

function fillTextVCenter(ctx, text, x, yMid) {
  const m = ctx.measureText(text);
  if (m && m.actualBoundingBoxAscent != null && m.actualBoundingBoxDescent != null) {
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x, yMid + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  } else {
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, yMid);
  }
}

function drawSizeBadge(ctx, cx, cy, n) {
  ctx.save();
  ctx.fillStyle = _acc;
  ctx.beginPath();
  ctx.arc(cx, cy, BADGE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = BADGE_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy + 0.5);
  ctx.restore();
}

function drawSizeLabels(ctx, node, W) {
  const has1 = !!node._cmpImg1, has2 = !!node._cmpImg2;
  if (!has1 && !has2) return;
  const full = row2Full(W);
  const rightEdge = full.x + full.w;
  const yMid = ROW2_Y + BTN_H / 2;
  const sizeCol = sizesDiffer(node) ? _acc : "#cfcfcf";
  if (has1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(full.x, ROW2_Y, SIZE_RESERVE, BTN_H);
    ctx.clip();
    const cx = full.x + BADGE_R;
    drawSizeBadge(ctx, cx, yMid, 1);
    ctx.font = SIZE_FONT;
    ctx.fillStyle = sizeCol;
    ctx.textAlign = "left";
    fillTextVCenter(ctx, dimsText(node._cmpImg1), cx + BADGE_R + 5, yMid);
    ctx.restore();
  }
  if (has2) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rightEdge - SIZE_RESERVE, ROW2_Y, SIZE_RESERVE, BTN_H);
    ctx.clip();
    const cx = rightEdge - BADGE_R;
    drawSizeBadge(ctx, cx, yMid, 2);
    ctx.font = SIZE_FONT;
    ctx.fillStyle = sizeCol;
    ctx.textAlign = "right";
    fillTextVCenter(ctx, dimsText(node._cmpImg2), cx - BADGE_R - 5, yMid);
    ctx.restore();
  }
}

const STATE_KEY = "compareState";

function cmpRepaint(node) {
  if (!node) return;
  node.setDirtyCanvas?.(true, true);
  if (window.LiteGraph?.vueNodesMode) node._cmpDomRender?.();
}

function buildCmpUrl(d) {
  return `/view?filename=${encodeURIComponent(d.filename)}&type=${encodeURIComponent(d.type)}&subfolder=${encodeURIComponent(d.subfolder || "")}&t=${Date.now()}`;
}

function loadCmpImage(node, meta, idx) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (idx === 0) node._cmpImg1 = img;
    else node._cmpImg2 = img;
    node.imgs = null;
    cmpRepaint(node);
  };
  img.src = buildCmpUrl(meta);
}

function cmpToast(msg) {
  const t = app.extensionManager?.toast;
  if (t?.add) t.add({ severity: "warn", summary: "Compare", detail: msg, life: 2500 });
  else console.warn("[Tallron] Compare:", msg);
}

function flashBtn(node, key, text) {
  node._cmpFlashKey = key;
  node._cmpFlashText = text;
  cmpRepaint(node);
  clearTimeout(node._cmpFlashTimer);
  node._cmpFlashTimer = setTimeout(() => {
    node._cmpFlashKey = null;
    node._cmpFlashText = null;
    cmpRepaint(node);
  }, 700);
}

async function shownImageBlob(node) {
  const which = node._cmpShowWhich;
  const img = which === 1 ? node._cmpImg1 : which === 2 ? node._cmpImg2 : null;
  if (!img || !img.src) return null;
  const resp = await fetch(img.src);
  if (!resp.ok) return null;
  return await resp.blob();
}

async function copyShownImage(node) {
  const which = node._cmpShowWhich;
  if (which !== 1 && which !== 2) return;
  const img = which === 1 ? node._cmpImg1 : node._cmpImg2;
  if (!img || !img.src) return;
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      cmpToast("Clipboard not available in this browser");
      return;
    }
    const resp = await fetch(img.src);
    const raw = await resp.blob();
    const blob = raw.type === "image/png"
      ? raw
      : new Blob([await raw.arrayBuffer()], { type: "image/png" });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    flashBtn(node, "copy", "Copied");
  } catch (err) {
    console.warn("[Tallron] Compare copy failed:", err);
    cmpToast("Could not copy to clipboard");
  }
}

async function downloadShownImage(node, key) {
  const which = node._cmpShowWhich;
  if (which !== 1 && which !== 2) return;
  try {
    const blob = await shownImageBlob(node);
    if (!blob) { cmpToast("Run the workflow first"); return; }
    const suggestedName = `Compare_${which}.png`;
    if (typeof window.showSaveFilePicker === "function" && key === "disk") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "PNG image", accept: { "image/png": [".png"] } }],
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        flashBtn(node, key, "Saved");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
        // fall through to anchor download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    flashBtn(node, key, "Saved");
  } catch (err) {
    console.warn("[Tallron] Compare save failed:", err);
    cmpToast("Could not save image");
  }
}

function saveCompareState(node) {
  node.properties = node.properties || {};
  const prev = node.properties[STATE_KEY] || {};
  node.properties[STATE_KEY] = {
    mode: node._cmpMode ?? 0,
    showWhich: node._cmpShowWhich ?? 0,
    opacity: node._cmpOpacity ?? 0.5,
    images: prev.images || [],
  };
}

function saveCompareImagesToProps(node, d1, d2) {
  node.properties = node.properties || {};
  const clean = (d) => (d
    ? { filename: d.filename, subfolder: d.subfolder || "", type: d.type || "temp" }
    : null);
  node.properties[STATE_KEY] = {
    mode: node._cmpMode ?? 0,
    showWhich: node._cmpShowWhich ?? 0,
    opacity: node._cmpOpacity ?? 0.5,
    images: [clean(d1), clean(d2)],
  };
}

function restoreCompareFromProperties(node) {
  if (node._cmpImg1 || node._cmpImg2) return;
  const s = node.properties?.[STATE_KEY];
  if (!s) return;
  if (typeof s.mode === "number") node._cmpMode = s.mode;
  if (typeof s.showWhich === "number") node._cmpShowWhich = s.showWhich;
  if (typeof s.opacity === "number") node._cmpOpacity = s.opacity;
  if (Array.isArray(s.images)) {
    if (s.images[0]) loadCmpImage(node, s.images[0], 0);
    if (s.images[1]) loadCmpImage(node, s.images[1], 1);
  }
  cmpRepaint(node);
}

function paintCompare(ctx, node, W, H, mouse) {
  _acc = accentOf(node);
  ctx.save();
  const showLabel = node._cmpShowWhich === 1 ? "Show 1" : node._cmpShowWhich === 2 ? "Show 2" : "Show 1";
  const hov = (rect) => !!(mouse &&
    mouse.x >= rect.x && mouse.x <= rect.x + rect.w &&
    mouse.y >= rect.y && mouse.y <= rect.y + rect.h);
  const sr = showRect(W);
  paintBtn(ctx, sr, showLabel, node._cmpShowWhich !== 0, hov(sr));
  for (let i = 0; i < 5; i++) {
    const mr = modeRect(W, i);
    paintBtn(ctx, mr, MODES[i], node._cmpShowWhich === 0 && node._cmpMode === i, hov(mr));
  }
  ctx.restore();

  ctx.save();
  const mid = row2Mid(node, W);
  if (node._cmpShowWhich === 0 && node._cmpMode === 3) {
    const { trackX, trackW, trackY, trackH } = sliderGeo(node, W);
    const pct = node._cmpOpacity;
    const thumbX = trackX + trackW * pct;

    ctx.font = "9px 'Segoe UI',sans-serif";
    ctx.fillStyle = "#999";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Opacity", mid.x, mid.y + mid.h / 2);

    ctx.fillStyle = "#2a2c2e";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(trackX, trackY, trackW, trackH, 3);
    else ctx.rect(trackX, trackY, trackW, trackH);
    ctx.fill();

    ctx.fillStyle = _acc;
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(trackX, trackY, Math.max(0, trackW * pct), trackH, 3);
    else ctx.rect(trackX, trackY, trackW * pct, trackH);
    ctx.fill();

    ctx.fillStyle = _acc;
    ctx.beginPath();
    ctx.arc(thumbX, mid.y + mid.h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(thumbX, mid.y + mid.h / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ccc";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${Math.round(pct * 100)}%`,
      trackX + trackW + 6,
      mid.y + mid.h / 2,
    );
  } else if (node._cmpShowWhich === 0) {
    const hint = MODE_HINTS[node._cmpMode] || "";
    ctx.save();
    ctx.beginPath();
    ctx.rect(mid.x, ROW2_Y, mid.w, BTN_H);
    ctx.clip();
    let hfs = 9;
    ctx.font = `${hfs}px 'Segoe UI',sans-serif`;
    while (hfs > 7.5 && ctx.measureText(hint).width > mid.w - 6) {
      hfs -= 0.5;
      ctx.font = `${hfs}px 'Segoe UI',sans-serif`;
    }
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hint, mid.x + mid.w / 2, mid.y + mid.h / 2);
    ctx.restore();
  }
  ctx.restore();

  drawSizeLabels(ctx, node, W);

  if (node._cmpShowWhich !== 0) {
    const which = node._cmpShowWhich;
    const fk = node._cmpFlashKey;
    const ft = node._cmpFlashText;
    const dR = diskRect(node, W), sR = saveRect(node, W), cR = copyRect(node, W);
    paintUtilBtn(ctx, dR, fk === "disk" ? ft : `Save D${which}`, hov(dR), fk === "disk");
    paintUtilBtn(ctx, sR, fk === "save" ? ft : `Save ${which}`, hov(sR), fk === "save");
    paintUtilBtn(ctx, cR, fk === "copy" ? ft : `Copy ${which}`, hov(cR), fk === "copy");
  }

  const imgH = H - IMG_Y;
  if (!node._cmpImg1 && !node._cmpImg2) {
    ctx.save();
    ctx.fillStyle = "#171718";
    ctx.fillRect(0, IMG_Y, W, imgH);
    ctx.fillStyle = "#555";
    ctx.font = "12px 'Segoe UI',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Connect images & run to compare",
      W / 2,
      IMG_Y + imgH / 2,
    );
    ctx.restore();
    return;
  }

  const fit = (img) => {
    if (!img) return { x: 0, y: IMG_Y, w: W, h: imgH };
    const a = img.naturalWidth / img.naturalHeight;
    const fh = W / a;
    if (fh <= imgH) return { x: 0, y: IMG_Y + (imgH - fh) / 2, w: W, h: fh };
    const fw = imgH * a;
    return { x: (W - fw) / 2, y: IMG_Y, w: fw, h: imgH };
  };
  const fr1 = fit(node._cmpImg1),
    fr2 = fit(node._cmpImg2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, IMG_Y, W, imgH);
  ctx.clip();
  ctx.fillStyle = "#111";
  ctx.fillRect(0, IMG_Y, W, imgH);

  if (node._cmpShowWhich !== 0) {
    const img = node._cmpShowWhich === 1 ? node._cmpImg1 : node._cmpImg2;
    if (img)
      ctx.drawImage(img, fit(img).x, fit(img).y, fit(img).w, fit(img).h);
    ctx.restore();
    return;
  }

  const m = node._cmpMode;
  if (m === 0 || m === 1) {
    const imgL = m === 0 ? node._cmpImg2 : node._cmpImg1;
    const imgR = m === 0 ? node._cmpImg1 : node._cmpImg2;
    const frL = m === 0 ? fr2 : fr1;
    const frR = m === 0 ? fr1 : fr2;
    const sx = W * node._cmpSplitX;
    if (imgR) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, IMG_Y, W - sx, imgH);
      ctx.clip();
      ctx.drawImage(imgR, frR.x, frR.y, frR.w, frR.h);
      ctx.restore();
    }
    if (imgL) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, IMG_Y, sx, imgH);
      ctx.clip();
      ctx.drawImage(imgL, frL.x, frL.y, frL.w, frL.h);
      ctx.restore();
    }
    if (node._cmpSplitX > 0.01 && node._cmpSplitX < 0.99) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, IMG_Y);
      ctx.lineTo(sx, IMG_Y + imgH);
      ctx.stroke();
    }
  } else if (m === 2) {
    const sy = IMG_Y + imgH * node._cmpSplitY;
    if (node._cmpImg1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, sy, W, IMG_Y + imgH - sy);
      ctx.clip();
      ctx.drawImage(node._cmpImg1, fr1.x, fr1.y, fr1.w, fr1.h);
      ctx.restore();
    }
    if (node._cmpImg2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, IMG_Y, W, sy - IMG_Y);
      ctx.clip();
      ctx.drawImage(node._cmpImg2, fr2.x, fr2.y, fr2.w, fr2.h);
      ctx.restore();
    }
    if (node._cmpSplitY > 0.01 && node._cmpSplitY < 0.99) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
      ctx.stroke();
    }
  } else if (m === 3) {
    if (node._cmpImg1)
      ctx.drawImage(node._cmpImg1, fr1.x, fr1.y, fr1.w, fr1.h);
    if (node._cmpImg2) {
      ctx.globalAlpha = node._cmpOpacity;
      ctx.drawImage(node._cmpImg2, fr2.x, fr2.y, fr2.w, fr2.h);
      ctx.globalAlpha = 1;
    }
  } else {
    if (node._cmpImg1)
      ctx.drawImage(node._cmpImg1, fr1.x, fr1.y, fr1.w, fr1.h);
    if (node._cmpImg2) {
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(node._cmpImg2, fr2.x, fr2.y, fr2.w, fr2.h);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  ctx.restore();
}

function cmpDown(node, lx, ly, W, H) {
  const pos = [lx, ly];
  if (node._cmpShowWhich !== 0) {
    if (inside(pos, diskRect(node, W))) { downloadShownImage(node, "disk"); return true; }
    if (inside(pos, saveRect(node, W))) { downloadShownImage(node, "save"); return true; }
    if (inside(pos, copyRect(node, W))) { copyShownImage(node); return true; }
  }
  if (inside(pos, showRect(W))) {
    node._cmpShowWhich = node._cmpShowWhich === 2 ? 1 : 2;
    saveCompareState(node);
    return true;
  }
  for (let i = 0; i < 5; i++)
    if (inside(pos, modeRect(W, i))) {
      node._cmpMode = i;
      node._cmpShowWhich = 0;
      saveCompareState(node);
      return true;
    }
  if (node._cmpMode === 3) {
    const g = sliderGeo(node, W);
    const hx = g.trackX, hw = g.trackW, hy = g.trackY - 6, hh = g.trackH + 12;
    if (lx >= hx - 8 && lx <= hx + hw + 8 && ly >= hy && ly <= hy + hh) {
      node._cmpOpacity = Math.max(0, Math.min(1, (lx - hx) / hw));
      node._cmpDragging = true;
      return true;
    }
  }
  return false;
}

function cmpMove(node, lx, ly, W, H) {
  if (node._cmpDragging && node._cmpMode === 3) {
    const g = sliderGeo(node, W);
    node._cmpOpacity = Math.max(0, Math.min(1, (lx - g.trackX) / g.trackW));
    return true;
  }
  if (
    node._cmpShowWhich === 0 &&
    node._cmpMode <= 2 &&
    (node._cmpImg1 || node._cmpImg2)
  ) {
    const imgW = W,
      imgH = H - IMG_Y;
    if (node._cmpMode <= 1)
      node._cmpSplitX = Math.max(0, Math.min(1, lx / imgW));
    else node._cmpSplitY = Math.max(0, Math.min(1, (ly - IMG_Y) / imgH));
    return true;
  }
  return false;
}

function cmpUp(node) {
  if (node._cmpDragging) saveCompareState(node);
  node._cmpDragging = false;
}

function cmpWheel(node, ly, deltaY) {
  if (node._cmpMode === 3 && ly > ROW1_Y) {
    node._cmpOpacity = Math.max(
      0,
      Math.min(1, node._cmpOpacity + (deltaY > 0 ? -0.05 : 0.05)),
    );
    saveCompareState(node);
    return true;
  }
  return false;
}

function cmpLeave(node) {
  if (node._cmpDragging) saveCompareState(node);
  node._cmpDragging = false;
  if (node._cmpMode <= 1) {
    node._cmpSplitX = 0;
  } else if (node._cmpMode === 2) {
    node._cmpSplitY = 0;
  }
}

function createCompareDOMWidget(node) {
  const root = document.createElement("div");
  root.className = "tlr-cmp-root";
  root.style.cssText =
    "position:relative;width:100%;flex:1 1 0;min-height:0;box-sizing:border-box;cursor:default;";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  root.appendChild(canvas);

  installCanvasZoomPassthrough(root);
  const widget = node.addDOMWidget("tallron_compare", "tallron_compare", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => MIN_H,
  });
  widget.computeLayoutSize = () => ({ minHeight: MIN_H, minWidth: 1 });
  applyAdaptiveCanvasOnly(widget);

  const BACKING_CAP = 6000;
  const backingScale = (cssW, cssH) => {
    const dpr = window.devicePixelRatio || 1;
    const zoom = Math.max(1, app.canvas?.ds?.scale || 1);
    let s = dpr * zoom;
    const longCss = Math.max(cssW, cssH);
    if (longCss * s > BACKING_CAP) s = BACKING_CAP / longCss;
    return s;
  };
  const TOP_TRIM = 8;
  const render = () => {
    const cssW = root.clientWidth;
    const cssH = root.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const s = backingScale(cssW, cssH);
    const bw = Math.round(cssW * s);
    const bh = Math.round(cssH * s);
    if (canvas.width !== bw) canvas.width = bw;
    if (canvas.height !== bh) canvas.height = bh;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.translate(0, -TOP_TRIM);
    node._cmpDomW = cssW;
    node._cmpDomH = cssH;
    paintCompare(ctx, node, cssW, cssH + TOP_TRIM, node._cmpDomMouse || null);
  };
  node._cmpDomRender = render;

  let _lastBackScale = -1;
  const zoomWatch = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (w > 0 && h > 0) {
      const s = backingScale(w, h);
      if (Math.abs(s - _lastBackScale) > 0.005) { _lastBackScale = s; render(); }
    }
    node._cmpZoomRaf = requestAnimationFrame(zoomWatch);
  };
  node._cmpZoomRaf = requestAnimationFrame(zoomWatch);

  const localPos = (e) => {
    const r = root.getBoundingClientRect();
    const sx = r.width ? root.clientWidth / r.width : 1;
    const sy = r.height ? root.clientHeight / r.height : 1;
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy + TOP_TRIM];
  };
  const W = () => node._cmpDomW || root.clientWidth;
  const H = () => (node._cmpDomH || root.clientHeight) + TOP_TRIM;

  root.addEventListener("pointerdown", (e) => {
    cmpHideTooltip();
    const [lx, ly] = localPos(e);
    if (cmpDown(node, lx, ly, W(), H())) {
      e.stopPropagation();
      if (node._cmpDragging) {
        try { root.setPointerCapture(e.pointerId); } catch {}
      }
      render();
    }
  });
  root.addEventListener("pointermove", (e) => {
    const [lx, ly] = localPos(e);
    node._cmpDomMouse = { x: lx, y: ly };
    root.style.cursor = cmpCursor(node, lx, ly, W(), H());
    cmpMove(node, lx, ly, W(), H());
    cmpShowTooltip(cmpTooltipFor(node, lx, ly, W()), e.clientX, e.clientY);
    render();
  });
  root.addEventListener("pointerup", (e) => {
    cmpUp(node);
    try { root.releasePointerCapture(e.pointerId); } catch {}
    render();
  });
  root.addEventListener("pointerleave", () => {
    node._cmpDomMouse = null;
    cmpHideTooltip();
    cmpLeave(node);
    render();
  });
  root.addEventListener("wheel", (e) => {
    const [, ly] = localPos(e);
    if (cmpWheel(node, ly, e.deltaY)) {
      e.preventDefault();
      e.stopPropagation();
      render();
    }
  }, { passive: false });

  const ro = new ResizeObserver(() => render());
  ro.observe(root);
  node._cmpDomRO = ro;
  requestAnimationFrame(render);
  return widget;
}

app.registerExtension({
  name: "Tallron.Compare",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "TallronCompare") return;

    const _origCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      _origCreated?.apply(this, arguments);

      // Default: Show 2
      this._cmpMode = 0;
      this._cmpShowWhich = 2;
      this._cmpSplitX = 0;
      this._cmpSplitY = 0;
      this._cmpOpacity = 0.5;
      this._cmpImg1 = null;
      this._cmpImg2 = null;
      this.size[0] = INIT_W;
      this.size[1] = INIT_H;

      this.hideOutputImages = true;

      if (isVueNodes()) {
        createCompareDOMWidget(this);
      }

      queueMicrotask(() => restoreCompareFromProperties(this));
    };

    const _origConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const r = _origConfigure ? _origConfigure.apply(this, arguments) : undefined;
      restoreCompareFromProperties(this);
      return r;
    };

    nodeType.prototype.onExecuted = function (output) {
      this.imgs = null;

      const imgs = Array.isArray(output?.images) ? output.images : [];
      let d1 = null, d2 = null;
      for (const d of imgs) {
        if (d?.slot === 2) d2 = d;
        else if (d?.slot === 1) d1 = d;
      }
      if (d1 == null && d2 == null && imgs.length) {
        d1 = imgs[0] || null;
        d2 = imgs[1] || null;
      }

      saveCompareImagesToProps(this, d1, d2);
      if (d1) loadCmpImage(this, d1, 0); else this._cmpImg1 = null;
      if (d2) loadCmpImage(this, d2, 1); else this._cmpImg2 = null;
      cmpRepaint(this);
    };

    nodeType.prototype.onDrawBackground = function () {
      if (this.flags?.collapsed) return;
      if (this.imgs) this.imgs = null;
    };

    const _origDraw = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function (ctx) {
      if (_origDraw) _origDraw.call(this, ctx);
      if (this.flags?.collapsed) return;
      if (isVueNodes()) return;

      if (this.size[0] < MIN_W) this.size[0] = MIN_W;
      if (this.size[1] < MIN_H) this.size[1] = MIN_H;

      let mouse = null;
      const gm = app.canvas?.graph_mouse;
      if (gm) mouse = { x: gm[0] - this.pos[0], y: gm[1] - this.pos[1] };

      paintCompare(ctx, this, this.size[0], this.size[1], mouse);
    };

    const _origDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function (e, pos) {
      if (isVueNodes()) return _origDown ? _origDown.call(this, e, pos) : undefined;
      cmpHideTooltip();
      if (cmpDown(this, pos[0], pos[1], this.size[0], this.size[1])) {
        app.graph.setDirtyCanvas(true, true);
        return true;
      }
      if (_origDown) return _origDown.call(this, e, pos);
    };

    const _origMove = nodeType.prototype.onMouseMove;
    nodeType.prototype.onMouseMove = function (e, pos) {
      if (isVueNodes()) return _origMove ? _origMove.call(this, e, pos) : undefined;
      if (cmpMove(this, pos[0], pos[1], this.size[0], this.size[1])) {
        app.graph.setDirtyCanvas(true, true);
      }
      cmpShowTooltip(cmpTooltipFor(this, pos[0], pos[1], this.size[0]), e?.clientX ?? 0, e?.clientY ?? 0);
      if (_origMove) return _origMove.call(this, e, pos);
    };

    const _origUp = nodeType.prototype.onMouseUp;
    nodeType.prototype.onMouseUp = function (e, pos) {
      if (isVueNodes()) return _origUp ? _origUp.call(this, e, pos) : undefined;
      cmpUp(this);
      if (_origUp) return _origUp.call(this, e, pos);
    };

    const _origWheel = nodeType.prototype.onMouseWheel;
    nodeType.prototype.onMouseWheel = function (e, pos) {
      if (isVueNodes()) return _origWheel ? _origWheel.call(this, e, pos) : undefined;
      if (cmpWheel(this, pos[1], e.deltaY)) {
        app.graph.setDirtyCanvas(true, true);
        return true;
      }
      if (_origWheel) return _origWheel.call(this, e, pos);
    };

    const _origLeave = nodeType.prototype.onMouseLeave;
    nodeType.prototype.onMouseLeave = function (e) {
      if (isVueNodes()) return _origLeave ? _origLeave.call(this, e) : undefined;
      cmpHideTooltip();
      cmpLeave(this);
      app.graph.setDirtyCanvas(true, true);
      if (_origLeave) return _origLeave.call(this, e);
    };

    const _origResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function (e) {
      if (_origResize) return _origResize.call(this, e);
      if (isVueNodes()) return;
      this.size[0] = Math.max(this.size[0], 390);
      this.size[1] = Math.max(this.size[1], 390);
    };

    const _origRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function () {
      try { this._cmpDomRO?.disconnect(); } catch {}
      try { cancelAnimationFrame(this._cmpZoomRaf); } catch {}
      cmpHideTooltip();
      this._cmpDomRO = null;
      this._cmpDomRender = null;
      return _origRemoved ? _origRemoved.apply(this, arguments) : undefined;
    };
  },
});
