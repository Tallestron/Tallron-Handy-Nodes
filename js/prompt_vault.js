import { app } from "../../scripts/app.js";

const NODE_NAME = "TallronPromptVault";
const NODE_WIDTH = 640;
const LIST_MIN_H = 240;
const LIST_MAX_H = 820;
const ROW_COLLAPSED_H = 36;
const ROW_BODY_CHROME = 40;
const TEXTAREA_MIN_H = 48;
const TEXTAREA_MAX_H = 320;
const PREVIEW_SIZE = 1024;
const JPEG_QUALITY = 0.88;
const PREVIEW_MIN_W = 120;
const PREVIEW_MAX_W = 360;
const CAT_W = 118;
const CAT_MIN_W = 90;
const CAT_MAX_W = 280;

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
function injectCSS() {
    if (document.getElementById("tallron-prompt-vault-css")) return;
    const style = document.createElement("style");
    style.id = "tallron-prompt-vault-css";
    style.textContent = `
.tpv-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: #1a1a1a;
    border-radius: 6px;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    color: #e0e0e0;
    user-select: none;
}
.tpv-title, .tpv-content { user-select: text; -webkit-user-select: text; }
.tpv-col-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 6px 8px;
    background: #252525;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
    gap: 6px;
    min-height: 32px;
    box-sizing: border-box;
}
.tpv-add-btn {
    background: #3a7bd5;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
}
.tpv-add-btn:hover { background: #4a8be5; }
.tpv-add-btn:active { background: #2a6bc5; }
.tpv-add-cat-btn {
    background: #2e8b57;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
}
.tpv-add-cat-btn:hover { background: #3aab6a; }
.tpv-add-cat-btn:active { background: #247a48; }

.tpv-body-split {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}

/* Categories column */
.tpv-cat-col {
    flex: 0 0 118px;
    width: 118px;
    min-width: 90px;
    max-width: 280px;
    display: flex;
    flex-direction: column;
    border-right: none;
    background: #1c1c1c;
}
.tpv-cat-list {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
}
.tpv-cat-list::-webkit-scrollbar { width: 5px; }
.tpv-cat-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.tpv-cat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 6px;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    color: #bbb;
    font-size: 11px;
    background: transparent;
    min-height: 26px;
    box-sizing: border-box;
}
.tpv-cat-item:hover { background: #252525; color: #eee; }
.tpv-cat-item.active {
    background: #1e2a3a;
    border-color: #5BA3F5;
    color: #8ec8ff;
}
.tpv-cat-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: transparent;
    border: 1px solid transparent;
    color: inherit;
    font: inherit;
    padding: 1px 3px;
    outline: none;
    cursor: pointer;
    border-radius: 3px;
    box-sizing: border-box;
}
.tpv-cat-name.editing {
    cursor: text;
    background: #111;
    border: 1px solid #5BA3F5;
    border-radius: 3px;
    padding: 1px 4px;
    color: #eee;
}
.tpv-cat-count {
    flex: 0 0 auto;
    font-size: 10px;
    color: #666;
    font-variant-numeric: tabular-nums;
}
.tpv-cat-item.active .tpv-cat-count { color: #6a9ec8; }
.tpv-cat-del {
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    border: none;
    background: transparent;
    color: #555;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    border-radius: 3px;
    display: none;
}
.tpv-cat-item:hover .tpv-cat-del { display: flex; align-items: center; justify-content: center; }
.tpv-cat-del:hover { color: #e55; background: #3a2222; }

/* List column */
.tpv-list-col {
    flex: 1 1 auto;
    min-width: 140px;
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.tpv-list {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
}
.tpv-list::-webkit-scrollbar { width: 6px; }
.tpv-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

/* Drag splitter */
.tpv-splitter,
.tpv-cat-splitter {
    flex: 0 0 6px;
    width: 6px;
    cursor: col-resize !important;
    background: #2a2a2a;
    border-left: 1px solid #333;
    border-right: 1px solid #333;
    position: relative;
    z-index: 5;
    touch-action: none;
}
.tpv-cat-splitter:hover,
.tpv-cat-splitter.dragging {
    background: #5BA3F5;
    border-color: #5BA3F5;
}
.tpv-cat-splitter::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -4px;
    right: -4px;
    cursor: col-resize !important;
}
.tpv-splitter:hover,
.tpv-splitter.dragging {
    background: #5BA3F5;
    border-color: #5BA3F5;
}
.tpv-splitter::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -4px;
    right: -4px;
    cursor: col-resize !important;
}
body.tpv-resizing,
body.tpv-resizing * {
    cursor: col-resize !important;
    user-select: none !important;
}

/* Preview column */
.tpv-preview-col {
    flex: 0 0 200px;
    width: 200px;
    min-width: ${PREVIEW_MIN_W}px;
    max-width: ${PREVIEW_MAX_W}px;
    display: flex;
    flex-direction: column;
    background: #1c1c1c;
    padding: 10px;
    gap: 8px;
    box-sizing: border-box;
    position: relative;
    z-index: 4;
    pointer-events: auto;
}
.tpv-preview-label {
    font-size: 11px;
    color: #888;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
}
.tpv-preview-label strong { color: #ccc; font-weight: 600; }
.tpv-preview-frame {
    flex: 1 1 auto;
    min-height: 100px;
    background: #111;
    border: 1px solid #333;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    cursor: default;
}
.tpv-preview-frame.has-image { cursor: zoom-in; }
.tpv-preview-frame img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    pointer-events: none;
    position: absolute;
    inset: 0;
    margin: auto;
}
.tpv-preview-empty {
    color: #555;
    font-size: 11px;
    text-align: center;
    padding: 12px;
    line-height: 1.4;
}
.tpv-preview-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    position: relative;
    z-index: 8;
    pointer-events: auto;
}
.tpv-load-btn, .tpv-clear-img-btn {
    flex: 1;
    appearance: none;
    border: 1px solid #444;
    background: #2a2a2a;
    color: #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
    position: relative;
    z-index: 8;
    pointer-events: auto !important;
    text-align: center;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
}
.tpv-load-btn:hover { background: #333; border-color: #5BA3F5; color: #fff; }
.tpv-load-btn.is-disabled, .tpv-clear-img-btn.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
.tpv-clear-img-btn:hover:not(.is-disabled) {
    background: #3a2222;
    border-color: #a55;
    color: #fcc;
}
.tpv-load-label {
    flex: 1;
    position: relative;
    z-index: 8;
    display: flex;
    pointer-events: auto !important;
}
.tpv-load-label input[type="file"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 9;
    font-size: 0;
}
.tpv-load-label.is-disabled {
    opacity: 0.45;
}
.tpv-load-label.is-disabled input[type="file"] {
    pointer-events: none;
    cursor: not-allowed;
}
.tpv-load-label .tpv-load-btn {
    width: 100%;
    pointer-events: none;
}
.tpv-preview-frame.tpv-drop-hover {
    border-color: #5BA3F5 !important;
    background: #1a2a3a;
}

.tpv-row {
    display: flex;
    flex-direction: column;
    background: #222;
    border: 1px solid #333;
    border-radius: 5px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
    cursor: pointer;
}
.tpv-row.dragging { opacity: 0.45; border-color: #5BA3F5; }
.tpv-row.drag-over { border-color: #5BA3F5; box-shadow: 0 0 0 1px #5BA3F5; }
.tpv-row.active-output {
    border-color: #3a9a5a;
    box-shadow: 0 0 0 1px #3a9a5a, inset 0 0 0 1px rgba(58, 154, 90, 0.25);
    background: #1e2a22;
}
.tpv-row-head {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    min-height: ${ROW_COLLAPSED_H - 8}px;
}
.tpv-handle {
    flex: 0 0 18px;
    width: 18px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    color: #666;
    font-size: 14px;
    line-height: 1;
    border-radius: 3px;
}
.tpv-handle:hover { color: #aaa; background: #333; }
.tpv-handle:active { cursor: grabbing; }
.tpv-thumb {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    border: 1px solid #333;
    background: #111;
    object-fit: cover;
    display: block;
}
.tpv-thumb.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #444;
    font-size: 10px;
}
.tpv-expand {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid #444;
    border-radius: 4px;
    color: #aaa;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
    padding: 0;
}
.tpv-expand:hover { background: #333; color: #fff; border-color: #666; }
.tpv-expand.open { background: #2a4a6a; border-color: #5BA3F5; color: #8ec8ff; }
.tpv-title {
    flex: 1 1 auto;
    min-width: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: #eee;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 6px;
    outline: none;
    height: 24px;
    box-sizing: border-box;
    cursor: default;
}
.tpv-title:not([readonly]):hover { border-color: #444; }
.tpv-title:not([readonly]):focus,
.tpv-title.editing {
    border-color: #5BA3F5;
    background: #1a1a1a;
    cursor: text;
}
.tpv-copy-head {
    flex: 0 0 auto;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a3a5a;
    border: 1px solid #3a5a8a;
    border-radius: 4px;
    color: #b8d0f0;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    padding: 0 7px;
    line-height: 1;
    white-space: nowrap;
}
.tpv-copy-head:hover { background: #345a7a; border-color: #5BA3F5; color: #fff; }
.tpv-copy-head.copied { background: #1a4a2a; border-color: #2a7a3a; color: #c8f0d0; }
.tpv-delete {
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}
.tpv-delete:hover { color: #e55; background: #3a2222; }
.tpv-rename-btn {
    flex: 0 0 20px;
    width: 20px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.55;
}
.tpv-rename-btn:hover { color: #8ec8ff; background: #2a3a4a; opacity: 1; }
.tpv-cat-item .tpv-rename-btn {
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    font-size: 10px;
    display: none;
}
.tpv-cat-item:hover .tpv-rename-btn { display: flex; }

.tpv-body {
    display: none;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px 8px 28px;
    border-top: 1px solid #2a2a2a;
}
.tpv-body.open { display: flex; }
.tpv-content {
    width: 100%;
    min-height: ${TEXTAREA_MIN_H}px;
    max-height: ${TEXTAREA_MAX_H}px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 12px;
    font-family: inherit;
    padding: 6px 8px;
    resize: none;
    outline: none;
    box-sizing: border-box;
    line-height: 1.4;
}
.tpv-content:focus { border-color: #5BA3F5; }
.tpv-empty {
    color: #555;
    text-align: center;
    padding: 24px 12px;
    line-height: 1.5;
    white-space: pre-line;
    font-size: 12px;
}
.tpv-footer {
    display: flex;
    gap: 8px;
    padding: 6px 10px;
    background: #222;
    border-top: 1px solid #333;
    flex-shrink: 0;
}
.tpv-footer-btn {
    appearance: none;
    border: 1px solid #444;
    background: #2a2a2a;
    color: #bbb;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    cursor: pointer;
}
.tpv-footer-btn:hover { background: #333; color: #fff; }

.tpv-lightbox {
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: rgba(0, 0, 0, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    cursor: zoom-out;
}
.tpv-lightbox img {
    max-width: min(96vw, 1100px);
    max-height: min(92vh, 1100px);
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
    pointer-events: none;
}
.tpv-lightbox-close {
    position: absolute;
    top: 16px;
    right: 20px;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(40, 40, 40, 0.9);
    color: #eee;
    font-size: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
.tpv-lightbox-close:hover { background: #555; }
`;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
function escapeHtml(str) {
    var amp = String.fromCharCode(38);
    return String(str ?? "")
        .replace(/&/g, amp + "amp;")
        .replace(/</g, amp + "lt;")
        .replace(/>/g, amp + "gt;")
        .replace(/"/g, amp + "quot;");
}

function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function getWidget(node, name) {
    return node.widgets?.find((w) => w.name === name);
}

function hideWidget(node, name) {
    const w = getWidget(node, name);
    if (!w) return;
    w.computeSize = () => [0, -4];
    w.draw = () => {};
    w.type = "hidden";
}

function readState(node) {
    const w = getWidget(node, "prompts_json");
    let raw = null;
    try {
        raw = JSON.parse(w?.value || "[]");
    } catch (_) {
        raw = [];
    }

    let prompts = [];
    let categories = [];
    let activeId = null;
    let activeCategoryId = null;
    let previewWidth = 200;
    let catWidth = 118;

    if (Array.isArray(raw)) {
        prompts = raw;
    } else if (raw && typeof raw === "object") {
        prompts = Array.isArray(raw.prompts)
            ? raw.prompts
            : Array.isArray(raw.notes)
              ? raw.notes
              : [];
        categories = Array.isArray(raw.categories) ? raw.categories : [];
        activeId = raw.activeId || null;
        activeCategoryId =
            raw.activeCategoryId === undefined ? null : raw.activeCategoryId;
        if (typeof raw.previewWidth === "number") previewWidth = raw.previewWidth;
        if (typeof raw.catWidth === "number") catWidth = raw.catWidth;
    }

    categories = categories.map((c) => ({
        id: c.id || uid(),
        name: typeof c.name === "string" ? c.name : "Category",
    }));

    // Ensure every prompt has a categoryId (null = uncategorized)
    const catIds = new Set(categories.map((c) => c.id));
    prompts = prompts.map((n) => ({
        id: n.id || uid(),
        title: typeof n.title === "string" ? n.title : "Untitled",
        content: typeof n.content === "string" ? n.content : "",
        image: typeof n.image === "string" && n.image.startsWith("data:") ? n.image : null,
        categoryId:
            n.categoryId && catIds.has(n.categoryId) ? n.categoryId : null,
        expanded: !!n.expanded,
    }));

    previewWidth = Math.max(PREVIEW_MIN_W, Math.min(PREVIEW_MAX_W, previewWidth || 200));
    catWidth = Math.max(CAT_MIN_W, Math.min(CAT_MAX_W, catWidth || 118));

    return { prompts, categories, activeId, activeCategoryId, previewWidth, catWidth };
}

function writeState(node, state) {
    const w = getWidget(node, "prompts_json");
    if (!w) return;
    const {
        prompts = [],
        categories = [],
        activeId = null,
        activeCategoryId = null,
        previewWidth = 200,
        catWidth = 118,
    } = state;
    w.value = JSON.stringify({
        categories: categories.map((c) => ({ id: c.id, name: c.name || "" })),
        prompts: prompts.map((p) => ({
            id: p.id,
            title: p.title || "",
            content: p.content || "",
            image: p.image || null,
            categoryId: p.categoryId || null,
            expanded: !!p.expanded,
        })),
        activeId: activeId || null,
        activeCategoryId: activeCategoryId ?? null,
        previewWidth: Math.max(PREVIEW_MIN_W, Math.min(PREVIEW_MAX_W, previewWidth || 200)),
        catWidth: Math.max(CAT_MIN_W, Math.min(CAT_MAX_W, catWidth || 118)),
    });
    if (w.callback) w.callback(w.value, app.canvas, node);
    node.setDirtyCanvas?.(true, true);
}

function setSelectedPrompt(node, text) {
    const w = getWidget(node, "selected_prompt");
    if (!w) return;
    w.value = text ?? "";
    if (w.callback) w.callback(w.value, app.canvas, node);
    node.setDirtyCanvas?.(true, true);
}

function autosizeTextarea(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(TEXTAREA_MAX_H, Math.max(TEXTAREA_MIN_H, ta.scrollHeight));
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > TEXTAREA_MAX_H ? "auto" : "hidden";
}


function enableNativeTextMenu(el) {
    if (!el) return;
    el.addEventListener("contextmenu", (e) => e.stopPropagation());
}

/** Reliable rename for Comfy DOM widgets (native dblclick is often swallowed). */
function bindRenameInput(input, { onSelect, onCommit, getRevertValue }) {
    let lastTap = 0;

    const beginEdit = () => {
        if (!input.readOnly) return;
        input.readOnly = false;
        input.classList.add("editing");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    input.focus({ preventScroll: true });
                    input.select();
                } catch (_) {
                    input.focus();
                    input.select();
                }
            });
        });
    };

    const endEdit = (commit) => {
        if (input.readOnly) return;
        input.readOnly = true;
        input.classList.remove("editing");
        if (commit) onCommit(input.value);
        else input.value = getRevertValue();
    };

    input.readOnly = true;
    input._tpvBeginEdit = beginEdit;

    input.addEventListener("pointerdown", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());

    input.addEventListener("pointerup", (e) => {
        if (e.button != null && e.button !== 0) return;
        e.stopPropagation();
        if (!input.readOnly) return;

        const now = performance.now();
        const dt = now - lastTap;
        lastTap = now;

        if (dt > 0 && dt < 450) {
            // Second quick tap → rename
            beginEdit();
            return;
        }
        // First tap → select only
        onSelect?.();
    });

    input.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        beginEdit();
    });

    input.addEventListener("blur", () => endEdit(true));
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
        } else if (e.key === "Escape") {
            e.preventDefault();
            endEdit(false);
            input.blur();
        }
    });
}

function makeRenameBtn(input) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tpv-rename-btn";
    btn.title = "Rename";
    btn.textContent = "✎";
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof input._tpvBeginEdit === "function") input._tpvBeginEdit();
    });
    return btn;
}


const BACKUP_FORMAT = "tallron-prompt-vault";
const BACKUP_VERSION = 2;

function vaultToBackupJson(state) {
    return JSON.stringify(
        {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exported: new Date().toISOString(),
            categories: (state.categories || []).map((c) => ({
                name: c.name || "",
            })),
            prompts: (state.prompts || []).map((n) => ({
                title: n.title || "",
                content: n.content || "",
                image: n.image || null,
                category: (state.categories || []).find((c) => c.id === n.categoryId)?.name || null,
            })),
        },
        null,
        2
    );
}

function parseBackupText(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return { categories: [], prompts: [] };

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        let data;
        try {
            data = JSON.parse(trimmed);
        } catch (_) {
            throw new Error("Invalid JSON backup file.");
        }
        let list = [];
        let cats = [];
        if (Array.isArray(data)) {
            list = data;
        } else if (data && typeof data === "object") {
            if (Array.isArray(data.prompts)) list = data.prompts;
            else if (Array.isArray(data.notes)) list = data.notes;
            else throw new Error("JSON backup has no prompts array.");
            if (Array.isArray(data.categories)) cats = data.categories;
        }
        // Build categories from names
        const catByName = new Map();
        for (const c of cats) {
            const name = typeof c === "string" ? c : c?.name || "Category";
            if (!catByName.has(name)) catByName.set(name, { id: uid(), name });
        }
        for (const n of list) {
            const cn =
                typeof n.category === "string"
                    ? n.category
                    : typeof n.categoryName === "string"
                      ? n.categoryName
                      : null;
            if (cn && !catByName.has(cn)) catByName.set(cn, { id: uid(), name: cn });
        }
        const categories = [...catByName.values()];
        const prompts = list.map((n) => {
            const cn =
                typeof n.category === "string"
                    ? n.category
                    : typeof n.categoryName === "string"
                      ? n.categoryName
                      : null;
            return {
                id: uid(),
                title:
                    typeof n.title === "string"
                        ? n.title
                        : typeof n.name === "string"
                          ? n.name
                          : "Untitled",
                content: typeof n.content === "string" ? n.content : "",
                image:
                    typeof n.image === "string" && n.image.startsWith("data:")
                        ? n.image
                        : null,
                categoryId: cn ? catByName.get(cn)?.id || null : null,
                expanded: false,
            };
        });
        return { categories, prompts };
    }

    const blocks = trimmed.split(/\n---\n/);
    const out = [];
    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (!lines.length || !lines[0].trim()) continue;
        let title = "Untitled";
        let start = 0;
        const first = lines[0].trim();
        if (first.startsWith("#")) {
            title = first.replace(/^#+\s*/, "").trim() || "Untitled";
            start = 1;
        }
        const content = lines.slice(start).join("\n").trim();
        out.push({
            id: uid(),
            title,
            content,
            image: null,
            categoryId: null,
            expanded: false,
        });
    }
    return { categories: [], prompts: out };
}

function dateStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function downloadBackup(jsonText, filename) {
    const name = filename || `tallron-prompt-vault-${dateStamp()}.json`;
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function resizeImageTo1024(file) {
    if (!file || !file.type?.startsWith("image/")) {
        throw new Error("Please choose an image file.");
    }
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch (err) {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Failed to read file."));
            reader.readAsDataURL(file);
        });
        bitmap = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to decode image."));
            img.src = dataUrl;
        });
    }
    const size = PREVIEW_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available.");
    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, x, y, w, h);
    if (typeof bitmap.close === "function") bitmap.close();
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function openLightbox(dataUrl) {
    if (!dataUrl) return;
    const existing = document.getElementById("tpv-lightbox");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.id = "tpv-lightbox";
    overlay.className = "tpv-lightbox";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Prompt reference";
    overlay.appendChild(img);
    const closeBtn = document.createElement("button");
    closeBtn.className = "tpv-lightbox-close";
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.title = "Close";
    overlay.appendChild(closeBtn);
    const close = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => {
        if (e.key === "Escape") close();
    };
    closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        close();
    });
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
}

// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Tallron.PromptVault",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) return;

        injectCSS();

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);

            this._tpv = {
                prompts: [],
                categories: [],
                activeId: null,
                activeCategoryId: null, // null = All
                previewWidth: 200,
                catWidth: 118,
                root: null,
                listEl: null,
                catListEl: null,
                previewFrame: null,
                previewLabel: null,
                previewCol: null,
                loadBtn: null,
                clearBtn: null,
                imageInput: null,
                fileInput: null,
                domWidget: null,
                dragId: null,
            };

            hideWidget(this, "prompts_json");
            hideWidget(this, "selected_prompt");

            this._tpvBuildUI();
            this._tpvLoadAndRender();

            if (!this.size || this.size[0] < 480) {
                this.setSize?.([NODE_WIDTH, 380]);
            }

            const origOnConfigure = this.onConfigure;
            this.onConfigure = function (info) {
                const r2 = origOnConfigure?.apply(this, arguments);
                setTimeout(() => {
                    hideWidget(this, "prompts_json");
                    hideWidget(this, "selected_prompt");
                    this._tpvLoadAndRender();
                }, 40);
                return r2;
            };

            setTimeout(() => {
                hideWidget(this, "prompts_json");
                hideWidget(this, "selected_prompt");
                this._tpvLoadAndRender();
            }, 80);

            return r;
        };

        nodeType.prototype._tpvPersist = function () {
            writeState(this, {
                prompts: this._tpv.prompts,
                categories: this._tpv.categories,
                activeId: this._tpv.activeId,
                activeCategoryId: this._tpv.activeCategoryId,
                previewWidth: this._tpv.previewWidth,
                catWidth: this._tpv.catWidth,
            });
            this._tpvUpdateSize();
        };

        nodeType.prototype._tpvFilteredPrompts = function () {
            const cat = this._tpv.activeCategoryId;
            if (cat == null) return this._tpv.prompts;
            return this._tpv.prompts.filter((p) => p.categoryId === cat);
        };

        nodeType.prototype._tpvBuildUI = function () {
            if (this._tpv.root) return;

            const root = document.createElement("div");
            root.className = "tpv-root";
            root.addEventListener("pointerdown", () => {
                document.body.classList.remove("tpv-resizing");
            });

            // Body: categories | list | splitter | preview  (no top title bar)
            const split = document.createElement("div");
            split.className = "tpv-body-split";

            // Categories column
            const catCol = document.createElement("div");
            catCol.className = "tpv-cat-col";
            const catHdr = document.createElement("div");
            catHdr.className = "tpv-col-header";
            const addCatBtn = document.createElement("button");
            addCatBtn.className = "tpv-add-cat-btn";
            addCatBtn.type = "button";
            addCatBtn.textContent = "+ Category";
            addCatBtn.title = "Add a category";
            addCatBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvAddCategory();
            });
            catHdr.appendChild(addCatBtn);
            const catList = document.createElement("div");
            catList.className = "tpv-cat-list";
            catList.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
            catCol.append(catHdr, catList);
            split.appendChild(catCol);

            // Category width splitter
            const catSplitter = document.createElement("div");
            catSplitter.className = "tpv-cat-splitter";
            catSplitter.title = "Drag to resize categories";
            split.appendChild(catSplitter);

            // List column
            const listCol = document.createElement("div");
            listCol.className = "tpv-list-col";
            const listHdr = document.createElement("div");
            listHdr.className = "tpv-col-header";
            const addBtn = document.createElement("button");
            addBtn.className = "tpv-add-btn";
            addBtn.type = "button";
            addBtn.textContent = "+ Prompt";
            addBtn.title = "Add a prompt to the active category";
            addBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvAddPrompt();
            });
            listHdr.appendChild(addBtn);
            const list = document.createElement("div");
            list.className = "tpv-list";
            list.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
            listCol.append(listHdr, list);
            split.appendChild(listCol);

            // Splitter
            const splitter = document.createElement("div");
            splitter.className = "tpv-splitter";
            splitter.title = "Drag to resize preview";
            split.appendChild(splitter);

            // Preview
            const previewCol = document.createElement("div");
            previewCol.className = "tpv-preview-col";
            const previewLabel = document.createElement("div");
            previewLabel.className = "tpv-preview-label";
            previewLabel.textContent = "No prompt selected";
            const previewFrame = document.createElement("div");
            previewFrame.className = "tpv-preview-frame";
            previewFrame.title = "Drop an image here after selecting a prompt";

            // Shared apply helper (file → 1024 → prompt by id)
            const applyImageFile = async (file, targetId) => {
                if (!file || !targetId) return false;
                if (!file.type || !file.type.startsWith("image/")) {
                    window.alert("Please choose an image file.");
                    return false;
                }
                try {
                    const dataUrl = await resizeImageTo1024(file);
                    let found = false;
                    this._tpv.prompts = this._tpv.prompts.map((x) => {
                        if (x.id !== targetId) {
                            return {
                                id: x.id,
                                title: x.title,
                                content: x.content,
                                image: x.image || null,
                                categoryId: x.categoryId ?? null,
                                expanded: !!x.expanded,
                            };
                        }
                        found = true;
                        return {
                            id: x.id,
                            title: x.title,
                            content: x.content,
                            image: dataUrl,
                            categoryId: x.categoryId ?? null,
                            expanded: !!x.expanded,
                        };
                    });
                    if (!found) {
                        window.alert("Selected prompt not found — select a prompt and try again.");
                        return false;
                    }
                    this._tpv.activeId = targetId;
                    this._tpvPersist();
                    this._tpvRender();
                    this._tpvUpdatePreview();
                    return true;
                } catch (err) {
                    console.error("[PromptVault] image load failed", err);
                    window.alert(err?.message || "Failed to load image.");
                    return false;
                }
            };
            this._tpvApplyImageFile = applyImageFile;

            previewFrame.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const active = this._tpv.prompts.find((p) => p.id === this._tpv.activeId);
                if (active?.image) openLightbox(active.image);
            });
            previewFrame.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this._tpv.activeId) previewFrame.classList.add("tpv-drop-hover");
            });
            previewFrame.addEventListener("dragleave", (e) => {
                e.preventDefault();
                e.stopPropagation();
                previewFrame.classList.remove("tpv-drop-hover");
            });
            previewFrame.addEventListener("drop", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                previewFrame.classList.remove("tpv-drop-hover");
                const id = this._tpv.activeId;
                if (!id) {
                    window.alert("Select a prompt first.");
                    return;
                }
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                loadBtnEl.textContent = "Loading…";
                loadLabel.classList.add("is-disabled");
                await applyImageFile(file, id);
                loadBtnEl.textContent = "Load Image";
                this._tpvSyncImageControls();
            });

            const actions = document.createElement("div");
            actions.className = "tpv-preview-actions";

            // Label + real file input — browser treats this as a direct user gesture
            const loadLabel = document.createElement("label");
            loadLabel.className = "tpv-load-label is-disabled";
            loadLabel.title = "Select a prompt, then choose an image";
            const loadBtnEl = document.createElement("span");
            loadBtnEl.className = "tpv-load-btn";
            loadBtnEl.textContent = "Load Image";
            const imageInput = document.createElement("input");
            imageInput.type = "file";
            imageInput.accept = "image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff";
            imageInput.tabIndex = -1;
            imageInput.addEventListener("pointerdown", (e) => e.stopPropagation());
            imageInput.addEventListener("mousedown", (e) => e.stopPropagation());
            imageInput.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!this._tpv.activeId) {
                    e.preventDefault();
                    window.alert("Select a prompt first.");
                    return;
                }
                this._tpv._imageTargetId = this._tpv.activeId;
            });
            imageInput.addEventListener("change", async () => {
                const file = imageInput.files && imageInput.files[0];
                // Reset so the same file can be chosen again
                imageInput.value = "";
                const targetId = this._tpv._imageTargetId || this._tpv.activeId;
                this._tpv._imageTargetId = null;
                if (!file || !targetId) return;
                loadBtnEl.textContent = "Loading…";
                loadLabel.classList.add("is-disabled");
                await applyImageFile(file, targetId);
                loadBtnEl.textContent = "Load Image";
                this._tpvSyncImageControls();
            });
            loadLabel.append(loadBtnEl, imageInput);
            loadLabel.addEventListener("pointerdown", (e) => e.stopPropagation());
            loadLabel.addEventListener("mousedown", (e) => e.stopPropagation());

            const clearBtn = document.createElement("button");
            clearBtn.className = "tpv-clear-img-btn is-disabled";
            clearBtn.type = "button";
            clearBtn.textContent = "Clear";
            clearBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
            clearBtn.addEventListener("mousedown", (e) => e.stopPropagation());
            clearBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.body.classList.remove("tpv-resizing");
                if (clearBtn.classList.contains("is-disabled")) return;
                this._tpvClearImage();
            });

            actions.append(loadLabel, clearBtn);
            previewCol.append(previewLabel, previewFrame, actions);
            split.appendChild(previewCol);
            root.appendChild(split);


            // Splitter drag — pointer capture + window listeners so release always works
            let dragPtrId = null;
            const endSplitDrag = () => {
                if (dragPtrId == null) return;
                try {
                    if (splitter.hasPointerCapture?.(dragPtrId)) {
                        splitter.releasePointerCapture(dragPtrId);
                    }
                } catch (_) {}
                dragPtrId = null;
                splitter.classList.remove("dragging");
                document.body.classList.remove("tpv-resizing");
                window.removeEventListener("pointermove", onSplitMove, true);
                window.removeEventListener("pointerup", onSplitUp, true);
                window.removeEventListener("pointercancel", onSplitUp, true);
                this._tpvPersist();
            };
            const onSplitMove = (e) => {
                if (dragPtrId == null || e.pointerId !== dragPtrId) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = split.getBoundingClientRect();
                const fromRight = rect.right - e.clientX;
                const next = Math.max(PREVIEW_MIN_W, Math.min(PREVIEW_MAX_W, fromRight));
                this._tpv.previewWidth = next;
                previewCol.style.flex = `0 0 ${next}px`;
                previewCol.style.width = `${next}px`;
            };
            const onSplitUp = (e) => {
                if (dragPtrId == null) return;
                if (e && e.pointerId != null && e.pointerId !== dragPtrId) return;
                endSplitDrag();
            };
            splitter.addEventListener("pointerdown", (e) => {
                if (e.button != null && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                dragPtrId = e.pointerId;
                splitter.classList.add("dragging");
                document.body.classList.add("tpv-resizing");
                try {
                    splitter.setPointerCapture(e.pointerId);
                } catch (_) {}
                window.addEventListener("pointermove", onSplitMove, true);
                window.addEventListener("pointerup", onSplitUp, true);
                window.addEventListener("pointercancel", onSplitUp, true);
            });
            // Prevent LiteGraph from treating splitter as a node drag
            splitter.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // Category splitter drag
            let catDragPtr = null;
            const endCatDrag = () => {
                if (catDragPtr == null) return;
                try {
                    if (catSplitter.hasPointerCapture?.(catDragPtr)) {
                        catSplitter.releasePointerCapture(catDragPtr);
                    }
                } catch (_) {}
                catDragPtr = null;
                catSplitter.classList.remove("dragging");
                document.body.classList.remove("tpv-resizing");
                window.removeEventListener("pointermove", onCatMove, true);
                window.removeEventListener("pointerup", onCatUp, true);
                window.removeEventListener("pointercancel", onCatUp, true);
                this._tpvPersist();
            };
            const onCatMove = (e) => {
                if (catDragPtr == null || e.pointerId !== catDragPtr) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = split.getBoundingClientRect();
                const fromLeft = e.clientX - rect.left;
                const next = Math.max(CAT_MIN_W, Math.min(CAT_MAX_W, fromLeft));
                this._tpv.catWidth = next;
                catCol.style.flex = `0 0 ${next}px`;
                catCol.style.width = `${next}px`;
            };
            const onCatUp = (e) => {
                if (catDragPtr == null) return;
                if (e && e.pointerId != null && e.pointerId !== catDragPtr) return;
                endCatDrag();
            };
            catSplitter.addEventListener("pointerdown", (e) => {
                if (e.button != null && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                catDragPtr = e.pointerId;
                catSplitter.classList.add("dragging");
                document.body.classList.add("tpv-resizing");
                try {
                    catSplitter.setPointerCapture(e.pointerId);
                } catch (_) {}
                window.addEventListener("pointermove", onCatMove, true);
                window.addEventListener("pointerup", onCatUp, true);
                window.addEventListener("pointercancel", onCatUp, true);
            });
            catSplitter.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // Footer
            const footer = document.createElement("div");
            footer.className = "tpv-footer";
            const importBtn = document.createElement("button");
            importBtn.className = "tpv-footer-btn";
            importBtn.type = "button";
            importBtn.textContent = "Import";
            importBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpv.fileInput?.click();
            });
            const exportBtn = document.createElement("button");
            exportBtn.className = "tpv-footer-btn";
            exportBtn.type = "button";
            exportBtn.textContent = "Export";
            exportBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvExport();
            });
            footer.append(importBtn, exportBtn);
            root.appendChild(footer);

            // File inputs
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".json,.md,.txt,application/json,text/markdown,text/plain";
            fileInput.style.display = "none";
            fileInput.addEventListener("change", () => {
                const file = fileInput.files?.[0];
                fileInput.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const imported = parseBackupText(String(reader.result || ""));
                        if (!imported.prompts.length && !imported.categories.length) {
                            window.alert("No prompts found in that file.");
                            return;
                        }
                        const replace = window.confirm(
                            `Import ${imported.prompts.length} prompt(s)` +
                                (imported.categories.length
                                    ? ` and ${imported.categories.length} categor${imported.categories.length === 1 ? "y" : "ies"}`
                                    : "") +
                                `.\n\nOK = replace current vault\nCancel = append`
                        );
                        if (replace) {
                            this._tpv.categories = imported.categories;
                            this._tpv.prompts = imported.prompts;
                            this._tpv.activeCategoryId = null;
                            this._tpv.activeId = imported.prompts[0]?.id || null;
                        } else {
                            this._tpv.categories = [
                                ...this._tpv.categories,
                                ...imported.categories,
                            ];
                            this._tpv.prompts = [
                                ...imported.prompts,
                                ...this._tpv.prompts,
                            ];
                        }
                        if (this._tpv.activeId) {
                            const active = this._tpv.prompts.find(
                                (p) => p.id === this._tpv.activeId
                            );
                            setSelectedPrompt(this, active?.content || "");
                        }
                        this._tpvPersist();
                        this._tpvRender();
                    } catch (err) {
                        window.alert(err?.message || "Failed to import.");
                    }
                };
                reader.readAsText(file);
            });
            root.appendChild(fileInput);
            this._tpv.fileInput = fileInput;


            const FOOTER_H = 36;
            const COL_HDR_H = 34;
            const domWidget = this.addDOMWidget("prompt_vault_ui", "div", root, {
                serialize: false,
            });
            domWidget.computeSize = () => {
                const w = this.size?.[0] || NODE_WIDTH;
                const prompts = this._tpvFilteredPrompts();
                let h = COL_HDR_H + FOOTER_H;
                if (prompts.length === 0) h += 120;
                else {
                    for (const n of prompts) {
                        h += ROW_COLLAPSED_H;
                        if (n.expanded) {
                            const lines = Math.max(2, (n.content || "").split("\n").length);
                            const estTa = Math.min(
                                TEXTAREA_MAX_H,
                                Math.max(TEXTAREA_MIN_H, lines * 17 + 16)
                            );
                            h += ROW_BODY_CHROME + estTa;
                        }
                    }
                    h += 12;
                }
                h = Math.max(LIST_MIN_H + FOOTER_H, Math.min(LIST_MAX_H, Math.max(h, 300)));
                return [w - 20, h];
            };
            domWidget.computedHeight = LIST_MIN_H;

            this._tpv.root = root;
            this._tpv.listEl = list;
            this._tpv.catListEl = catList;
            this._tpv.previewFrame = previewFrame;
            this._tpv.previewLabel = previewLabel;
            this._tpv.previewCol = previewCol;
            this._tpv.catCol = catCol;
            this._tpv.loadLabel = loadLabel;
            this._tpv.loadBtnEl = loadBtnEl;
            this._tpv.loadBtn = loadBtnEl; // alias for older enable logic
            this._tpv.clearBtn = clearBtn;
            this._tpv.imageInput = imageInput;
            this._tpv.domWidget = domWidget;
        };

        nodeType.prototype._tpvApplyCatWidth = function () {
            const col = this._tpv.catCol;
            if (!col) return;
            const w = Math.max(CAT_MIN_W, Math.min(CAT_MAX_W, this._tpv.catWidth || 118));
            this._tpv.catWidth = w;
            col.style.flex = `0 0 ${w}px`;
            col.style.width = `${w}px`;
        };

        nodeType.prototype._tpvApplyPreviewWidth = function () {
            const col = this._tpv.previewCol;
            if (!col) return;
            const w = Math.max(
                PREVIEW_MIN_W,
                Math.min(PREVIEW_MAX_W, this._tpv.previewWidth || 200)
            );
            this._tpv.previewWidth = w;
            col.style.flex = `0 0 ${w}px`;
            col.style.width = `${w}px`;
        };

        nodeType.prototype._tpvExport = async function () {
            await downloadBackup(
                vaultToBackupJson({
                    categories: this._tpv.categories,
                    prompts: this._tpv.prompts,
                })
            );
        };

        nodeType.prototype._tpvLoadAndRender = function () {
            const state = readState(this);
            this._tpv.prompts = state.prompts;
            this._tpv.categories = state.categories;
            this._tpv.activeId = state.activeId;
            this._tpv.activeCategoryId = state.activeCategoryId;
            this._tpv.previewWidth = state.previewWidth;
            this._tpv.catWidth = state.catWidth;
            this._tpvApplyPreviewWidth();
            this._tpvApplyCatWidth();
            this._tpvRender();
            this._tpvUpdatePreview();
        };

        nodeType.prototype._tpvUpdateSize = function () {
            const dw = this._tpv.domWidget;
            if (!dw) return;
            requestAnimationFrame(() => {
                const size = dw.computeSize();
                let measured = 40;
                const rows = this._tpv.listEl?.querySelectorAll(".tpv-row");
                if (rows && rows.length) {
                    rows.forEach((row) => {
                        measured += row.offsetHeight + 4;
                    });
                    measured += 36;
                    measured = Math.max(300, Math.min(LIST_MAX_H, measured));
                    size[1] = measured;
                }
                dw.computedHeight = size[1];
                this.setSize?.([this.size?.[0] || NODE_WIDTH, this.size?.[1] || 380]);
                this.setDirtyCanvas?.(true, true);
            });
        };

        // ----- Categories -----
        nodeType.prototype._tpvAddCategory = function () {
            const cat = { id: uid(), name: "New Category" };
            this._tpv.categories.push(cat);
            this._tpv.activeCategoryId = cat.id;
            this._tpvPersist();
            this._tpvRender();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const input = this._tpv.catListEl?.querySelector(
                        `.tpv-cat-item[data-id="${cat.id}"] .tpv-cat-name`
                    );
                    if (input) {
                        input.readOnly = false;
                        input.classList.add("editing");
                        try {
                            input.focus({ preventScroll: true });
                            input.select();
                        } catch (_) {
                            input.focus();
                            input.select();
                        }
                    }
                });
            });
        };

        nodeType.prototype._tpvDeleteCategory = function (id) {
            const c = this._tpv.categories.find((x) => x.id === id);
            if (!c) return;
            const count = this._tpv.prompts.filter((p) => p.categoryId === id).length;
            const msg =
                count > 0
                    ? `Delete category “${c.name}”?\n${count} prompt(s) will become Uncategorized.`
                    : `Delete category “${c.name}”?`;
            if (!window.confirm(msg)) return;
            this._tpv.prompts.forEach((p) => {
                if (p.categoryId === id) p.categoryId = null;
            });
            this._tpv.categories = this._tpv.categories.filter((x) => x.id !== id);
            if (this._tpv.activeCategoryId === id) this._tpv.activeCategoryId = null;
            this._tpvPersist();
            this._tpvRender();
        };

        nodeType.prototype._tpvSelectCategory = function (id) {
            // id null = All
            this._tpv.activeCategoryId = id;
            this._tpvPersist();
            this._tpvRender();
        };

        // ----- Prompts -----
        nodeType.prototype._tpvAddPrompt = function () {
            const note = {
                id: uid(),
                title: "New Prompt",
                content: "",
                image: null,
                categoryId: this._tpv.activeCategoryId, // may be null (All → uncategorized)
                expanded: true,
            };
            // New array + new objects so images can never leak across prompts
            this._tpv.prompts = [note, ...this._tpv.prompts.map((x) => ({
                id: x.id,
                title: x.title,
                content: x.content,
                image: x.image || null,
                categoryId: x.categoryId ?? null,
                expanded: !!x.expanded,
            }))];
            this._tpv.activeId = note.id;
            setSelectedPrompt(this, "");
            this._tpvPersist();
            this._tpvRender();
            this._tpvUpdatePreview();
        };

        nodeType.prototype._tpvDeletePrompt = function (id) {
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n) return;
            const label = (n.title || "Untitled").slice(0, 40);
            if (!window.confirm(`Delete prompt “${label}”?`)) return;
            this._tpv.prompts = this._tpv.prompts.filter((x) => x.id !== id);
            if (this._tpv.activeId === id) {
                this._tpv.activeId = null;
                setSelectedPrompt(this, "");
            }
            this._tpvPersist();
            this._tpvRender();
            this._tpvUpdatePreview();
        };

        nodeType.prototype._tpvToggleExpand = function (id) {
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n) return;
            n.expanded = !n.expanded;
            this._tpvPersist();
            this._tpvRender();
        };

        nodeType.prototype._tpvUpdateField = function (id, field, value) {
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n) return;
            n[field] = value;
            this._tpvPersist();
            if (field === "content" && this._tpv.activeId === id) {
                setSelectedPrompt(this, value);
            }
            if (field === "title" && this._tpv.activeId === id) {
                this._tpvUpdatePreview();
            }
        };

        nodeType.prototype._tpvSelect = function (id) {
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n) return;
            this._tpv.activeId = id;
            setSelectedPrompt(this, n.content || "");
            this._tpvPersist();
            this._tpvRender();
            this._tpvUpdatePreview();
        };

        nodeType.prototype._tpvCopy = async function (id, btn) {
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n) return;
            this._tpv.activeId = id;
            setSelectedPrompt(this, n.content || "");
            this._tpvPersist();
            this._tpvRender();
            this._tpvUpdatePreview();
            try {
                await navigator.clipboard.writeText(n.content || "");
                if (btn) {
                    const prev = btn.textContent;
                    btn.textContent = "Copied ✓";
                    btn.classList.add("copied");
                    setTimeout(() => {
                        btn.textContent = prev;
                        btn.classList.remove("copied");
                    }, 1200);
                }
            } catch (err) {
                const ta = document.createElement("textarea");
                ta.value = n.content || "";
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand("copy");
                    if (btn) {
                        const prev = btn.textContent;
                        btn.textContent = "Copied ✓";
                        btn.classList.add("copied");
                        setTimeout(() => {
                            btn.textContent = prev;
                            btn.classList.remove("copied");
                        }, 1200);
                    }
                } catch (_) {}
                document.body.removeChild(ta);
            }
        };

        nodeType.prototype._tpvClearImage = function () {
            if (!this._tpv.activeId) return;
            const id = this._tpv.activeId;
            const n = this._tpv.prompts.find((x) => x.id === id);
            if (!n || !n.image) return;
            if (!window.confirm("Remove the image from this prompt?")) return;
            this._tpv.prompts = this._tpv.prompts.map((x) =>
                x.id === id
                    ? {
                          id: x.id,
                          title: x.title,
                          content: x.content,
                          image: null,
                          categoryId: x.categoryId ?? null,
                          expanded: !!x.expanded,
                      }
                    : x
            );
            this._tpvPersist();
            this._tpvRender();
            this._tpvUpdatePreview();
        };


        nodeType.prototype._tpvSyncImageControls = function () {
            const loadLabel = this._tpv.loadLabel;
            const clearBtn = this._tpv.clearBtn;
            const active = this._tpv.prompts.find((p) => p.id === this._tpv.activeId);
            const hasImage =
                active &&
                typeof active.image === "string" &&
                active.image.startsWith("data:");
            if (loadLabel) {
                if (active) loadLabel.classList.remove("is-disabled");
                else loadLabel.classList.add("is-disabled");
            }
            if (clearBtn) {
                if (hasImage) clearBtn.classList.remove("is-disabled");
                else clearBtn.classList.add("is-disabled");
            }
        };

        nodeType.prototype._tpvUpdatePreview = function () {
            const frame = this._tpv.previewFrame;
            const label = this._tpv.previewLabel;
            const loadBtn = this._tpv.loadBtn;
            const clearBtn = this._tpv.clearBtn;
            if (!frame || !label) return;
            const active = this._tpv.prompts.find((p) => p.id === this._tpv.activeId);
            if (!active) {
                label.textContent = "No prompt selected";
                frame.classList.remove("has-image");
                frame.innerHTML =
                    '<div class="tpv-preview-empty">Select a prompt<br>to preview its image</div>';
                this._tpvSyncImageControls();
                return;
            }
            const activeImage =
                typeof active.image === "string" && active.image.startsWith("data:")
                    ? active.image
                    : null;
            label.innerHTML = `Selected: <strong>${escapeHtml(active.title || "Untitled")}</strong>`;
            this._tpvSyncImageControls();
            if (activeImage) {
                frame.classList.add("has-image");
                frame.innerHTML = "";
                const img = document.createElement("img");
                img.src = activeImage;
                img.alt = active.title || "Reference";
                frame.appendChild(img);
            } else {
                frame.classList.remove("has-image");
                frame.innerHTML =
                    '<div class="tpv-preview-empty">No image yet<br>Click “Load Image”</div>';
            }
        };

        // ----- Drag reorder (filtered list order → full list) -----
        nodeType.prototype._tpvBindDrag = function (handle, row, id) {
            handle.addEventListener("dragstart", (e) => {
                this._tpv.dragId = id;
                row.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
            });
            handle.addEventListener("dragend", () => {
                this._tpv.dragId = null;
                row.classList.remove("dragging");
                this._tpv.listEl
                    ?.querySelectorAll(".tpv-row.drag-over")
                    .forEach((el) => el.classList.remove("drag-over"));
            });
            row.addEventListener("dragover", (e) => {
                if (!this._tpv.dragId || this._tpv.dragId === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                row.classList.add("drag-over");
            });
            row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
            row.addEventListener("drop", (e) => {
                e.preventDefault();
                row.classList.remove("drag-over");
                const fromId = this._tpv.dragId;
                if (!fromId || fromId === id) return;
                const fromIdx = this._tpv.prompts.findIndex((p) => p.id === fromId);
                const toIdx = this._tpv.prompts.findIndex((p) => p.id === id);
                if (fromIdx < 0 || toIdx < 0) return;
                const [item] = this._tpv.prompts.splice(fromIdx, 1);
                this._tpv.prompts.splice(toIdx, 0, item);
                this._tpv.dragId = null;
                this._tpvPersist();
                this._tpvRender();
            });
        };

        // ----- Render -----
        nodeType.prototype._tpvRender = function () {
            this._tpvRenderCategories();
            this._tpvRenderList();
        };

        nodeType.prototype._tpvRenderCategories = function () {
            const el = this._tpv.catListEl;
            if (!el) return;
            el.innerHTML = "";

            const counts = new Map();
            for (const p of this._tpv.prompts) {
                const k = p.categoryId || "__none__";
                counts.set(k, (counts.get(k) || 0) + 1);
            }

            // All
            const allItem = document.createElement("div");
            allItem.className =
                "tpv-cat-item" + (this._tpv.activeCategoryId == null ? " active" : "");
            allItem.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvSelectCategory(null);
            });
            const allName = document.createElement("span");
            allName.className = "tpv-cat-name";
            allName.textContent = "All";
            const allCount = document.createElement("span");
            allCount.className = "tpv-cat-count";
            allCount.textContent = String(this._tpv.prompts.length);
            allItem.append(allName, allCount);
            el.appendChild(allItem);

            for (const cat of this._tpv.categories) {
                const item = document.createElement("div");
                item.className =
                    "tpv-cat-item" +
                    (this._tpv.activeCategoryId === cat.id ? " active" : "");
                item.dataset.id = cat.id;
                item.addEventListener("click", (e) => {
                    if (e.target.closest(".tpv-cat-del")) return;
                    if (e.target.closest(".tpv-cat-name")) return; // name handles its own select/edit
                    e.preventDefault();
                    e.stopPropagation();
                    this._tpvSelectCategory(cat.id);
                });

                const nameInput = document.createElement("input");
                nameInput.className = "tpv-cat-name";
                nameInput.type = "text";
                nameInput.value = cat.name;
                nameInput.title = "Click to select · Double-click or ✎ to rename";
                enableNativeTextMenu(nameInput);
                bindRenameInput(nameInput, {
                    onSelect: () => this._tpvSelectCategory(cat.id),
                    onCommit: (value) => {
                        const c = this._tpv.categories.find((x) => x.id === cat.id);
                        if (c) {
                            c.name = (value || "").trim() || "Category";
                            nameInput.value = c.name;
                            this._tpvPersist();
                        }
                    },
                    getRevertValue: () => cat.name,
                });
                const catRenameBtn = makeRenameBtn(nameInput);

                const count = document.createElement("span");
                count.className = "tpv-cat-count";
                count.textContent = String(counts.get(cat.id) || 0);

                const del = document.createElement("button");
                del.className = "tpv-cat-del";
                del.type = "button";
                del.textContent = "×";
                del.title = "Delete category";
                del.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._tpvDeleteCategory(cat.id);
                });

                item.append(nameInput, catRenameBtn, count, del);
                el.appendChild(item);
            }
        };

        nodeType.prototype._tpvRenderList = function () {
            const list = this._tpv.listEl;
            if (!list) return;
            list.innerHTML = "";
            const prompts = this._tpvFilteredPrompts();
            if (prompts.length === 0) {
                const empty = document.createElement("div");
                empty.className = "tpv-empty";
                empty.textContent =
                    this._tpv.activeCategoryId == null
                        ? "No prompts yet.\nClick “+ Prompt” to create one."
                        : "No prompts in this category.\nClick “+ Prompt” to add one.";
                list.appendChild(empty);
                this._tpvUpdateSize();
                return;
            }
            for (const prompt of prompts) {
                list.appendChild(this._tpvCreateRow(prompt));
            }
            this._tpvUpdateSize();
            requestAnimationFrame(() => {
                list.querySelectorAll(".tpv-content").forEach((ta) => {
                    if (ta.closest(".tpv-body.open")) autosizeTextarea(ta);
                });
                this._tpvUpdateSize();
            });
        };

        nodeType.prototype._tpvCreateRow = function (prompt) {
            const row = document.createElement("div");
            row.className =
                "tpv-row" +
                (this._tpv.activeId === prompt.id ? " active-output" : "");
            row.dataset.id = prompt.id;

            row.addEventListener("click", (e) => {
                if (
                    e.target.closest(
                        "button, input, textarea, .tpv-handle, .tpv-expand, .tpv-copy-head, .tpv-delete"
                    )
                )
                    return;
                this._tpvSelect(prompt.id);
            });

            const head = document.createElement("div");
            head.className = "tpv-row-head";

            const handle = document.createElement("div");
            handle.className = "tpv-handle";
            handle.title = "Drag to reorder";
            handle.innerHTML = "⋮⋮";
            handle.draggable = true;
            this._tpvBindDrag(handle, row, prompt.id);
            head.appendChild(handle);

            // Look up image by id from live state (never trust a stale row object)
            const live = this._tpv.prompts.find((x) => x.id === prompt.id);
            const liveImage =
                live && typeof live.image === "string" && live.image.startsWith("data:")
                    ? live.image
                    : null;
            if (liveImage) {
                const thumb = document.createElement("img");
                thumb.className = "tpv-thumb";
                thumb.src = liveImage;
                thumb.alt = "";
                head.appendChild(thumb);
            } else {
                const thumb = document.createElement("div");
                thumb.className = "tpv-thumb placeholder";
                thumb.textContent = "·";
                head.appendChild(thumb);
            }

            const expandBtn = document.createElement("button");
            expandBtn.className = "tpv-expand" + (prompt.expanded ? " open" : "");
            expandBtn.type = "button";
            expandBtn.textContent = prompt.expanded ? "−" : "+";
            expandBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvToggleExpand(prompt.id);
            });
            head.appendChild(expandBtn);

            const titleInput = document.createElement("input");
            titleInput.className = "tpv-title";
            titleInput.type = "text";
            titleInput.value = prompt.title;
            titleInput.placeholder = "Prompt name";
            titleInput.spellcheck = false;
            titleInput.title = "Click to select · Double-click or ✎ to rename";
            enableNativeTextMenu(titleInput);
            bindRenameInput(titleInput, {
                onSelect: () => this._tpvSelect(prompt.id),
                onCommit: (value) => {
                    this._tpvUpdateField(prompt.id, "title", value);
                },
                getRevertValue: () => prompt.title,
            });
            head.appendChild(titleInput);
            head.appendChild(makeRenameBtn(titleInput));

            const copyBtn = document.createElement("button");
            copyBtn.className = "tpv-copy-head";
            copyBtn.type = "button";
            copyBtn.textContent = "Copy";
            copyBtn.title = "Copy prompt to clipboard and set as STRING output";
            copyBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvCopy(prompt.id, copyBtn);
            });
            head.appendChild(copyBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "tpv-delete";
            delBtn.type = "button";
            delBtn.title = "Delete prompt";
            delBtn.textContent = "×";
            delBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpvDeletePrompt(prompt.id);
            });
            head.appendChild(delBtn);
            row.appendChild(head);

            const body = document.createElement("div");
            body.className = "tpv-body" + (prompt.expanded ? " open" : "");
            const textarea = document.createElement("textarea");
            textarea.className = "tpv-content";
            textarea.value = prompt.content;
            textarea.placeholder = "Write your prompt…";
            textarea.spellcheck = true;
            textarea.addEventListener("input", () => {
                this._tpvUpdateField(prompt.id, "content", textarea.value);
                autosizeTextarea(textarea);
                this._tpvUpdateSize();
            });
            textarea.addEventListener("keydown", (e) => e.stopPropagation());
            textarea.addEventListener("mousedown", (e) => e.stopPropagation());
            textarea.addEventListener("click", (e) => e.stopPropagation());
            textarea.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
            enableNativeTextMenu(textarea);
            body.appendChild(textarea);
            row.appendChild(body);
            return row;
        };
    },
});
