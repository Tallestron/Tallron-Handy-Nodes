import { app } from "../../scripts/app.js";

const NODE_NAME = "TallronPromptBuilder";
const NODE_WIDTH = 560;
const PANEL_MIN_H = 180;

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------
function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const TAG_COLORS = [
    "#e74c3c", // red
    "#e67e22", // orange
    "#f1c40f", // yellow
    "#2ecc71", // green
    "#1abc9c", // teal
    "#3498db", // blue
    "#9b59b6", // purple
    "#e84393", // pink
    "#95a5a6", // gray
];

const DEFAULT_CAT_COLORS = {
    Setting: "#3498db",
    Lighting: "#e67e22",
    People: "#e74c3c",
    "Hair Styles": "#9b59b6",
    Ethnicity: "#e74c3c",
    "Street Clothing": "#f1c40f",
    Lingerie: "#f1c40f",
    Swimsuit: "#f1c40f",
};

function defaultCategories() {
    const cats = [
        {
            id: uid(),
            name: "Setting",
            items: [
                { id: uid(), text: "on a sunny beach" },
                { id: uid(), text: "in a lush forest" },
                { id: uid(), text: "inside a modern apartment" },
                { id: uid(), text: "on a busy city street at night" },
                { id: uid(), text: "in a luxurious hotel room" },
                { id: uid(), text: "at a rooftop party" },
                { id: uid(), text: "in a cozy cafe" },
                { id: uid(), text: "under a starry sky" },
            ],
        },
        {
            id: uid(),
            name: "Lighting",
            items: [
                { id: uid(), text: "soft natural daylight" },
                { id: uid(), text: "golden hour sunlight" },
                { id: uid(), text: "dramatic rim lighting" },
                { id: uid(), text: "soft studio lighting" },
                { id: uid(), text: "neon city lights" },
                { id: uid(), text: "candlelight" },
                { id: uid(), text: "overcast soft light" },
                { id: uid(), text: "cinematic volumetric lighting" },
            ],
        },
        {
            id: uid(),
            name: "People",
            items: [
                { id: uid(), text: "a beautiful young woman" },
                { id: uid(), text: "a handsome man" },
                { id: uid(), text: "a couple" },
                { id: uid(), text: "an elegant woman" },
                { id: uid(), text: "an athletic man" },
                { id: uid(), text: "a smiling girl" },
                { id: uid(), text: "a group of friends" },
            ],
        },
        {
            id: uid(),
            name: "Hair Styles",
            items: [
                { id: uid(), text: "long wavy hair" },
                { id: uid(), text: "short bob cut" },
                { id: uid(), text: "high ponytail" },
                { id: uid(), text: "messy bun" },
                { id: uid(), text: "braided hair" },
                { id: uid(), text: "pixie cut" },
                { id: uid(), text: "flowing blonde hair" },
                { id: uid(), text: "dark straight hair" },
            ],
        },
        {
            id: uid(),
            name: "Ethnicity",
            items: [
                { id: uid(), text: "Caucasian" },
                { id: uid(), text: "Asian" },
                { id: uid(), text: "African American" },
                { id: uid(), text: "Latina" },
                { id: uid(), text: "Middle Eastern" },
                { id: uid(), text: "mixed race" },
                { id: uid(), text: "Indian" },
                { id: uid(), text: "Scandinavian" },
            ],
        },
        {
            id: uid(),
            name: "Street Clothing",
            items: [
                { id: uid(), text: "wearing jeans and a t-shirt" },
                { id: uid(), text: "in a stylish hoodie and sneakers" },
                { id: uid(), text: "casual summer dress" },
                { id: uid(), text: "leather jacket and boots" },
                { id: uid(), text: "oversized sweater and shorts" },
                { id: uid(), text: "athletic wear" },
                { id: uid(), text: "trendy streetwear outfit" },
                { id: uid(), text: "denim jacket and skirt" },
            ],
        },
        {
            id: uid(),
            name: "Lingerie",
            items: [
                { id: uid(), text: "wearing delicate lace lingerie" },
                { id: uid(), text: "in a silk robe" },
                { id: uid(), text: "sheer babydoll" },
                { id: uid(), text: "matching bra and panties set" },
                { id: uid(), text: "elegant corset" },
                { id: uid(), text: "lace bodysuit" },
                { id: uid(), text: "satin chemise" },
                { id: uid(), text: "strappy lingerie" },
            ],
        },
        {
            id: uid(),
            name: "Swimsuit",
            items: [
                { id: uid(), text: "wearing a bikini" },
                { id: uid(), text: "in a one-piece swimsuit" },
                { id: uid(), text: "stylish beachwear" },
                { id: uid(), text: "high-waisted bikini" },
                { id: uid(), text: "monokini" },
                { id: uid(), text: "sports swimsuit" },
                { id: uid(), text: "elegant swimsuit with cover-up" },
                { id: uid(), text: "string bikini" },
            ],
        },
    ];
    return cats.map((c) => ({ ...c, color: DEFAULT_CAT_COLORS[c.name] || "#888" }));
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
function injectCSS() {
    if (document.getElementById("tallron-prompt-builder-css")) return;
    const style = document.createElement("style");
    style.id = "tallron-prompt-builder-css";
    style.textContent = `
.tpb-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: #1a1a1a;
    border-radius: 6px;
    overflow: hidden;
    min-width: 0;
    max-width: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    color: #e0e0e0;
    user-select: none;
    pointer-events: auto;
}
.tpb-colors {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #1c1c1c;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
    flex-wrap: wrap;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}
.tpb-colors-label {
    font-size: 10px;
    color: #888;
    margin-right: 2px;
}
.tpb-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: transform 0.1s, border-color 0.1s;
}
.tpb-dot:hover { transform: scale(1.2); }
.tpb-dot.active { border-color: #fff; }
.tpb-dot-clear {
    background: #3a3a3a;
    color: #ccc;
    font-size: 11px;
    font-weight: 700;
    line-height: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}
.tpb-dot-clear:hover { background: #555; color: #fff; }
.tpb-tag {
    flex: 0 0 10px;
    width: 10px;
    height: 14px;
    border-radius: 2px;
    background: #555;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
}
.tpb-tag.empty {
    background: transparent;
    box-shadow: inset 0 0 0 1px #555;
}
.tpb-top {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    width: 100%;
    overflow: hidden;
}
.tpb-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
}
.tpb-col-left {
    flex: 0 0 180px;
    width: 180px;
    min-width: 0;
    border-right: none;
}
.tpb-splitter {
    flex: 0 0 6px;
    width: 6px;
    cursor: col-resize;
    background: #2a2a2a;
    border-left: 1px solid #333;
    border-right: 1px solid #333;
    position: relative;
    z-index: 5;
    touch-action: none;
}
.tpb-splitter:hover,
.tpb-splitter.dragging {
    background: #5BA3F5;
    border-color: #5BA3F5;
}
.tpb-splitter::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -4px;
    right: -4px;
}
.tpb-rename-input {
    flex: 1 1 auto;
    min-width: 40px;
    width: 100%;
    background: #111;
    border: 1px solid #5BA3F5;
    border-radius: 3px;
    color: #fff;
    font-size: 12px;
    padding: 1px 4px;
    outline: none;
    font-family: inherit;
    user-select: text;
    -webkit-user-select: text;
    pointer-events: auto;
    position: relative;
    z-index: 2;
}
.tpb-col-right {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
}
.tpb-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 6px 8px;
    background: #252525;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
    gap: 6px;
    min-height: 34px;
    min-width: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
}
.tpb-pencil {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: #777;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}
.tpb-pencil:hover { color: #fff; background: #333; border-color: #555; }
.tpb-header-label {
    font-weight: 600;
    font-size: 11px;
    color: #aaa;
    letter-spacing: 0.02em;
    margin-right: auto;
}
.tpb-btn-green {
    background: #2e8b57;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}
.tpb-btn-green:hover { background: #3aab6a; }
.tpb-btn-green:active { background: #247a48; }
.tpb-btn-blue {
    background: #3a7bd5;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
    line-height: 1;
}
.tpb-btn-blue:hover { background: #4a8be5; }
.tpb-btn-blue:active { background: #2a6bc5; }
.tpb-list {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    max-height: 100%;
}
.tpb-list::-webkit-scrollbar { width: 5px; }
.tpb-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
.tpb-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 6px;
    border-radius: 4px;
    cursor: pointer;
    color: #ccc;
    background: transparent;
    transition: background 0.1s, border-color 0.1s, opacity 0.1s;
    border: 1px solid transparent;
    flex-shrink: 0;
}
.tpb-item:hover { background: #2a2a2a; color: #eee; }
.tpb-item.active {
    background: #1e3a5f;
    color: #fff;
}
.tpb-item.dragging { opacity: 0.4; }
.tpb-item.drag-over {
    border-color: #5BA3F5;
    background: #1a2a3a;
}
.tpb-handle {
    flex: 0 0 14px;
    width: 14px;
    cursor: grab;
    color: #666;
    font-size: 13px;
    line-height: 1;
    text-align: center;
    user-select: none;
}
.tpb-handle:hover { color: #aaa; }
.tpb-handle:active { cursor: grabbing; }
.tpb-item-text {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
}
.tpb-item-text.editing {
    background: #111;
    border: 1px solid #5BA3F5;
    border-radius: 3px;
    padding: 1px 4px;
    outline: none;
    white-space: normal;
}
.tpb-del {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    display: none;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    border-radius: 3px;
    padding: 0;
    line-height: 1;
}
.tpb-item:hover .tpb-del { display: flex; }
.tpb-del:hover { color: #e55; background: #3a2222; }

.tpb-bottom {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    border-top: 1px solid #333;
    background: #161616;
    min-height: 120px;
    max-height: 55%;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
}
.tpb-bottom-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: #222;
    border-bottom: 1px solid #333;
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    flex-shrink: 0;
}
.tpb-clear-btn,
.tpb-mini-btn {
    background: transparent;
    border: 1px solid #555;
    color: #aaa;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 10px;
    cursor: pointer;
    white-space: nowrap;
}
.tpb-clear-btn:hover,
.tpb-mini-btn:hover { background: #333; color: #fff; }
.tpb-btn-row {
    display: flex;
    gap: 4px;
    align-items: center;
}
.tpb-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
}
.tpb-modal {
    background: #222;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 14px;
    width: 420px;
    max-width: 92vw;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    font-family: system-ui, sans-serif;
    color: #eee;
}
.tpb-modal h3 {
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
}
.tpb-modal p {
    margin: 0 0 8px 0;
    font-size: 11px;
    color: #aaa;
}
.tpb-modal textarea {
    width: 100%;
    height: 180px;
    box-sizing: border-box;
    background: #111;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    padding: 8px;
    resize: vertical;
}
.tpb-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}
.tpb-modal-actions button {
    border: none;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
}
.tpb-modal-cancel { background: #444; color: #ccc; }
.tpb-modal-ok { background: #3a7bd5; color: #fff; }
.tpb-selected-list {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-content: flex-start;
    min-height: 0;
}
.tpb-clear-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    flex-shrink: 0;
    border-top: 1px solid #2a2a2a;
    background: #141414;
}
.tpb-copy-prompt {
    background: #3a7bd5;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 5px 18px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.02em;
}
.tpb-copy-prompt:hover { background: #4a8be5; }
.tpb-copy-prompt:active { background: #2a6bc5; }
.tpb-clear-prompt {
    background: #c0392b;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 5px 18px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.02em;
}
.tpb-clear-prompt:hover { background: #e74c3c; }
.tpb-clear-prompt:active { background: #a93226; }
.tpb-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #2a3a2a;
    border: 1px solid #3a5a3a;
    border-radius: 12px;
    padding: 3px 6px 3px 8px;
    font-size: 11px;
    color: #cfc;
    max-width: 100%;
    cursor: grab;
}
.tpb-chip.dragging { opacity: 0.4; }
.tpb-chip.drag-over { border-color: #5BA3F5; box-shadow: 0 0 0 1px #5BA3F5; }
.tpb-chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.tpb-chip-del {
    background: transparent;
    border: none;
    color: #8a8;
    cursor: pointer;
    font-size: 13px;
    padding: 0 2px;
    line-height: 1;
}
.tpb-chip-del:hover { color: #e55; }
.tpb-preview {
    flex: 0 0 auto;
    max-height: 140px;
    overflow-y: auto;
    padding: 6px 8px;
    font-size: 11px;
    line-height: 1.4;
    color: #bbb;
    border-top: 1px solid #2a2a2a;
    white-space: normal;
    word-break: break-word;
    background: #141414;
}
`;
    document.head.appendChild(style);

    // Capture-phase wheel handler so lists scroll instead of zooming the canvas
    if (!window.__tpbWheelBound) {
        window.__tpbWheelBound = true;
        window.addEventListener(
            "wheel",
            (e) => {
                const t = e.target;
                if (!t || !t.closest) return;
                const list = t.closest(".tpb-list, .tpb-selected-list");
                if (!list) return;
                e.preventDefault();
                e.stopPropagation();
                list.scrollTop += e.deltaY;
            },
            { capture: true, passive: false }
        );
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getWidget(node, name) {
    return node.widgets?.find((w) => w.name === name);
}
function hideWidget(node, name) {
    const w = getWidget(node, name);
    if (w) {
        w.type = "hidden";
        w.computeSize = () => [0, -4];
    }
}
function enableNativeTextMenu(el) {
    el.addEventListener("contextmenu", (e) => e.stopPropagation());
    el.addEventListener("keydown", (e) => e.stopPropagation());
    el.addEventListener("mousedown", (e) => e.stopPropagation());
}

// ---------------------------------------------------------------------------
// Import / Export helpers
// ---------------------------------------------------------------------------
const BACKUP_FORMAT = "tallron-prompt-builder";
const BACKUP_VERSION = 1;

function dateStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function databaseToBackupJson(state) {
    return JSON.stringify(
        {
            format: BACKUP_FORMAT,
            version: BACKUP_VERSION,
            exported: new Date().toISOString(),
            categories: (state.categories || []).map((c) => ({
                name: c.name || "",
                color: c.color || null,
                items: (c.items || []).map((it) => it.text || ""),
            })),
            selected: (state.selected || []).map((s) => ({
                text: s.text || "",
                categoryId: s.categoryId || null,
                color: s.color || null,
            })),
        },
        null,
        2
    );
}

function parseDatabaseBackup(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) throw new Error("Empty file.");
    let data;
    try {
        data = JSON.parse(trimmed);
    } catch (_) {
        throw new Error("Invalid JSON.");
    }
    if (!data || typeof data !== "object") throw new Error("Bad backup format.");
    const catsRaw = Array.isArray(data.categories) ? data.categories : [];
    const categories = catsRaw.map((c) => {
        const name = typeof c === "string" ? c : (c?.name || "Untitled");
        const itemsRaw = Array.isArray(c?.items) ? c.items : [];
        return {
            id: uid(),
            name: String(name),
            color: typeof c?.color === "string" ? c.color : null,
            items: itemsRaw.map((it) => ({
                id: uid(),
                text: typeof it === "string" ? it : (it?.text || ""),
            })).filter((it) => it.text),
        };
    });
    const selectedRaw = Array.isArray(data.selected) ? data.selected : [];
    const selected = selectedRaw.map((s) => ({
        id: uid(),
        text: typeof s === "string" ? s : (s?.text || ""),
        categoryId: typeof s === "object" ? s?.categoryId || null : null,
        color: typeof s === "object" ? s?.color || null : null,
    })).filter((s) => s.text);
    return { categories, selected };
}

function parseSnippetList(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return [];
    // Try JSON array first
    if (trimmed.startsWith("[")) {
        try {
            const arr = JSON.parse(trimmed);
            if (Array.isArray(arr)) {
                return arr
                    .map((x) => (typeof x === "string" ? x : x?.text || ""))
                    .map((s) => String(s).trim())
                    .filter(Boolean);
            }
        } catch (_) {}
    }
    // One snippet per line (ignore empty lines and # comments)
    return trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
}

async function downloadBackup(jsonText, filename) {
    const name = filename || `tallron-prompt-builder-${dateStamp()}.json`;
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 500);
}

function showTextPrompt(title, placeholder, onOk) {
    const overlay = document.createElement("div");
    overlay.className = "tpb-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "tpb-modal";
    modal.innerHTML = `
        <h3></h3>
        <input type="text" style="width:100%;box-sizing:border-box;background:#111;border:1px solid #444;border-radius:4px;color:#eee;padding:6px 8px;font-size:12px;" />
        <div class="tpb-modal-actions">
            <button class="tpb-modal-cancel" type="button">Cancel</button>
            <button class="tpb-modal-ok" type="button">OK</button>
        </div>
    `;
    modal.querySelector("h3").textContent = title;
    const input = modal.querySelector("input");
    input.placeholder = placeholder || "";
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    modal.querySelector(".tpb-modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    modal.querySelector(".tpb-modal-ok").addEventListener("click", () => {
        const v = input.value.trim();
        close();
        if (v) onOk(v);
    });
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            modal.querySelector(".tpb-modal-ok").click();
        } else if (e.key === "Escape") {
            close();
        }
    });
    enableNativeTextMenu(input);
    setTimeout(() => input.focus(), 30);
}

function showListImportModal(onImport) {
    const overlay = document.createElement("div");
    overlay.className = "tpb-modal-overlay";
    const modal = document.createElement("div");
    modal.className = "tpb-modal";
    modal.innerHTML = `
        <h3>Import snippet list</h3>
        <p>Paste one snippet per line (or a JSON array of strings). Empty lines and # comments are ignored.</p>
        <textarea placeholder="on a sunny beach&#10;golden hour sunlight&#10;wearing a bikini"></textarea>
        <div class="tpb-modal-actions">
            <button class="tpb-modal-cancel" type="button">Cancel</button>
            <button class="tpb-modal-ok" type="button">Import</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const ta = modal.querySelector("textarea");
    const cancel = modal.querySelector(".tpb-modal-cancel");
    const ok = modal.querySelector(".tpb-modal-ok");
    const close = () => overlay.remove();
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    ok.addEventListener("click", () => {
        const lines = parseSnippetList(ta.value);
        close();
        if (lines.length) onImport(lines);
    });
    ta.focus();
    enableNativeTextMenu(ta);
}

// ---------------------------------------------------------------------------
// Node extension
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Tallron.PromptBuilder",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_NAME) return;

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            origOnNodeCreated?.apply(this, arguments);
            try {
                this._tpbBuild?.();
            } catch (err) {
                console.error("[Tallron Prompt Builder] UI failed:", err);
            }
        };

        nodeType.prototype._tpbBuild = function () {
            injectCSS();

            // State
            this._tpb = {
                categories: defaultCategories(),
                activeCategoryId: null,
                selected: [],
                catWidth: 180,
            };
            // Select first category by default
            if (this._tpb.categories.length) {
                this._tpb.activeCategoryId = this._tpb.categories[0].id;
            }

            // Load from widget if present
            const jsonW = getWidget(this, "builder_json");
            if (jsonW && jsonW.value && jsonW.value !== "{}" && jsonW.value !== "[]") {
                try {
                    const data = JSON.parse(jsonW.value);
                    if (Array.isArray(data.categories) && data.categories.length) {
                        this._tpb.categories = data.categories;
                    }
                    if (typeof data.activeCategoryId === "string") {
                        this._tpb.activeCategoryId = data.activeCategoryId;
                    }
                    if (Array.isArray(data.selected)) {
                        this._tpb.selected = data.selected;
                    }
                    if (typeof data.catWidth === "number") {
                        this._tpb.catWidth = data.catWidth;
                    }
                } catch (_) {}
            }

            hideWidget(this, "builder_json");
            hideWidget(this, "composed_prompt");

            // Build UI
            const root = document.createElement("div");
            root.className = "tpb-root";

            // Color dots — click to set the selected category's tag color
            const colorBar = document.createElement("div");
            colorBar.className = "tpb-colors";
            const colorLabel = document.createElement("span");
            colorLabel.className = "tpb-colors-label";
            colorLabel.textContent = "Groups";
            colorBar.appendChild(colorLabel);
            const colorDots = [];
            for (const hex of TAG_COLORS) {
                const dot = document.createElement("button");
                dot.type = "button";
                dot.className = "tpb-dot";
                dot.style.background = hex;
                dot.title = "Set selected category tag color";
                dot.dataset.color = hex;
                colorBar.appendChild(dot);
                colorDots.push(dot);
            }
            const clearColorBtn = document.createElement("button");
            clearColorBtn.type = "button";
            clearColorBtn.className = "tpb-dot tpb-dot-clear";
            clearColorBtn.textContent = "×";
            clearColorBtn.title = "Clear color of the selected category";
            colorBar.appendChild(clearColorBtn);
            root.appendChild(colorBar);

            // Top split
            const top = document.createElement("div");
            top.className = "tpb-top";

            // Left column
            const left = document.createElement("div");
            left.className = "tpb-col tpb-col-left";
            const leftHeader = document.createElement("div");
            leftHeader.className = "tpb-header";
            const addCatBtn = document.createElement("button");
            addCatBtn.className = "tpb-btn-green";
            addCatBtn.type = "button";
            addCatBtn.textContent = "+ Category";
            addCatBtn.title = "Add a new category";
            leftHeader.appendChild(addCatBtn);
            left.appendChild(leftHeader);
            const catList = document.createElement("div");
            catList.className = "tpb-list";
            left.appendChild(catList);
            const applyCatWidth = (w) => {
                if (typeof w === "number" && w > 0) this._tpb.catWidth = Math.round(w);
                const desired = this._tpb.catWidth || 180;
                const total = root.clientWidth || top.clientWidth || 560;
                const max = Math.max(64, total - 72);
                const visual = Math.max(64, Math.min(max, desired));
                left.style.flex = "0 0 " + visual + "px";
                left.style.width = visual + "px";
                left.style.minWidth = "0";
                left.style.maxWidth = visual + "px";
            };
            this._tpb.fitWidth = () => applyCatWidth();
            applyCatWidth(this._tpb.catWidth);
            top.appendChild(left);

            const splitter = document.createElement("div");
            splitter.className = "tpb-splitter";
            splitter.title = "Drag to resize categories";
            top.appendChild(splitter);

            // Right column
            const right = document.createElement("div");
            right.className = "tpb-col tpb-col-right";
            const rightHeader = document.createElement("div");
            rightHeader.className = "tpb-header";
            const addItemBtn = document.createElement("button");
            addItemBtn.className = "tpb-btn-blue";
            addItemBtn.type = "button";
            addItemBtn.textContent = "+Snippet";
            addItemBtn.title = "Import a list of snippets into the selected category (one per line)";
            rightHeader.appendChild(addItemBtn);
            right.appendChild(rightHeader);
            const itemList = document.createElement("div");
            itemList.className = "tpb-list";
            right.appendChild(itemList);
            top.appendChild(right);

            root.appendChild(top);

            // Bottom
            const bottom = document.createElement("div");
            bottom.className = "tpb-bottom";
            const bottomHeader = document.createElement("div");
            bottomHeader.className = "tpb-bottom-header";
            const bottomLabel = document.createElement("span");
            bottomLabel.textContent = "Selected snippets";
            const btnRow = document.createElement("div");
            btnRow.className = "tpb-btn-row";
            const dbImportBtn = document.createElement("button");
            dbImportBtn.className = "tpb-mini-btn";
            dbImportBtn.type = "button";
            dbImportBtn.textContent = "Import";
            dbImportBtn.title = "Import full database from JSON";
            const dbExportBtn = document.createElement("button");
            dbExportBtn.className = "tpb-mini-btn";
            dbExportBtn.type = "button";
            dbExportBtn.textContent = "Export";
            dbExportBtn.title = "Export full database to JSON";
            btnRow.appendChild(dbImportBtn);
            btnRow.appendChild(dbExportBtn);
            bottomHeader.appendChild(bottomLabel);
            bottomHeader.appendChild(btnRow);
            bottom.appendChild(bottomHeader);
            const selectedList = document.createElement("div");
            selectedList.className = "tpb-selected-list";
            bottom.appendChild(selectedList);
            const preview = document.createElement("div");
            preview.className = "tpb-preview";
            bottom.appendChild(preview);
            const clearWrap = document.createElement("div");
            clearWrap.className = "tpb-clear-wrap";
            const copyBtn = document.createElement("button");
            copyBtn.className = "tpb-copy-prompt";
            copyBtn.type = "button";
            copyBtn.textContent = "Copy Prompt";
            copyBtn.title = "Copy the composed prompt to the clipboard";
            const clearBtn = document.createElement("button");
            clearBtn.className = "tpb-clear-prompt";
            clearBtn.type = "button";
            clearBtn.textContent = "Clear Prompt";
            clearBtn.title = "Clear all selected snippets";
            clearWrap.appendChild(copyBtn);
            clearWrap.appendChild(clearBtn);
            bottom.appendChild(clearWrap);
            root.appendChild(bottom);

            const domWidget = this.addDOMWidget("prompt_builder_ui", "div", root, {
                serialize: false,
                hideOnZoom: false,
            });
            const MIN_WIDGET_H = 300;
            this._tpb.lockedH = 380;
            const applyLockedHeight = (h) => {
                const locked = Math.max(MIN_WIDGET_H, h || this._tpb.lockedH || 380);
                this._tpb.lockedH = locked;
                root.style.height = locked + "px";
                root.style.maxHeight = locked + "px";
                root.style.overflow = "hidden";
                domWidget.computedHeight = locked;
            };
            domWidget.computeSize = function (width) {
                const nodeW = this.size?.[0] || width || NODE_WIDTH;
                return [Math.max(160, nodeW - 24), this._tpb.lockedH];
            }.bind(this);
            root.style.boxSizing = "border-box";
            root.style.minWidth = "0";
            root.style.overflow = "hidden";
            let parent = root.parentElement;
            for (let i = 0; i < 4 && parent; i++) {
                parent.style.minWidth = "0";
                parent.style.boxSizing = "border-box";
                parent = parent.parentElement;
            }
            this._tpb.root = root;
            this._tpb.left = left;
            this._tpb.domWidget = domWidget;
            this._tpb.syncHeight = applyLockedHeight;
            applyLockedHeight(380);

            // Persist helpers
            const persist = () => {
                const data = {
                    categories: this._tpb.categories,
                    activeCategoryId: this._tpb.activeCategoryId,
                    selected: this._tpb.selected,
                    catWidth: this._tpb.catWidth,
                };
                const w = getWidget(this, "builder_json");
                if (w) w.value = JSON.stringify(data);
                this.graph?.setDirtyCanvas?.(true, false);
            };

            const updateOutput = () => {
                const colorOf = (s) => {
                    if (s.color) return s.color;
                    const cat = this._tpb.categories.find((c) => c.id === s.categoryId);
                    return cat?.color || null;
                };
                let text = "";
                const sel = this._tpb.selected;
                for (let i = 0; i < sel.length; i++) {
                    if (i === 0) {
                        text = sel[i].text;
                        continue;
                    }
                    const prev = colorOf(sel[i - 1]);
                    const cur = colorOf(sel[i]);
                    const sep = prev && cur && prev === cur ? " " : ", ";
                    text += sep + sel[i].text;
                }
                const w = getWidget(this, "composed_prompt");
                if (w) w.value = text;
                preview.textContent = text || "(empty — click items to add)";
                persist();
            };

            // Drag-reorder helper for categories or items
            const bindDrag = (row, handle, id, list, onReorder) => {
                handle.setAttribute("draggable", "true");
                handle.addEventListener("dragstart", (e) => {
                    e.stopPropagation();
                    row.classList.add("dragging");
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", id);
                    list._dragId = id;
                });
                handle.addEventListener("dragend", () => {
                    row.classList.remove("dragging");
                    list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
                    list._dragId = null;
                });
                row.addEventListener("dragover", (e) => {
                    if (!list._dragId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    row.classList.add("drag-over");
                });
                row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
                row.addEventListener("drop", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    row.classList.remove("drag-over");
                    const fromId = list._dragId;
                    if (!fromId || fromId === id) return;
                    onReorder(fromId, id);
                });
            };

            const stopBtn = (btn) => {
                btn.addEventListener("pointerdown", (e) => e.stopPropagation());
                btn.addEventListener("mousedown", (e) => e.stopPropagation());
            };

            const fitCatWidth = () => {};

            let activeRename = null;
            const beginRename = (textEl, onDone) => {
                if (activeRename) activeRename.close(true);
                if (!textEl || !textEl.parentNode) return;
                const input = document.createElement("input");
                input.type = "text";
                input.className = "tpb-rename-input";
                input.value = textEl.textContent || "";
                input.spellcheck = false;
                textEl.style.display = "none";
                textEl.parentNode.insertBefore(input, textEl.nextSibling);
                const stop = (e) => e.stopPropagation();
                input.addEventListener("pointerdown", (e) => {
                    e.stopPropagation();
                });
                input.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                });
                input.addEventListener("click", stop);
                const onKey = (e) => {
                    if (document.activeElement === input) e.stopPropagation();
                };
                window.addEventListener("keydown", onKey, true);
                window.addEventListener("keyup", onKey, true);
                let done = false;
                let focusTimer = 0;
                const close = (commit) => {
                    if (done) return;
                    done = true;
                    if (focusTimer) clearTimeout(focusTimer);
                    window.removeEventListener("keydown", onKey, true);
                    window.removeEventListener("keyup", onKey, true);
                    const name = commit
                        ? (input.value.trim() || textEl.textContent || "Untitled")
                        : textEl.textContent;
                    if (input.parentNode) input.remove();
                    textEl.style.display = "";
                    textEl.textContent = name;
                    if (activeRename && activeRename.close === close) activeRename = null;
                    if (commit) onDone(name);
                    // Don't leave focus on the Comfy node shell — that paints a
                    // blue ring and clears the header background.
                    const shell = root.parentElement;
                    requestAnimationFrame(() => {
                        const ae = document.activeElement;
                        if (!ae || ae === document.body || root.contains(ae)) return;
                        if (shell && (ae === shell || shell.contains(ae))) ae.blur();
                    });
                };
                input.addEventListener("keydown", (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                        e.preventDefault();
                        close(true);
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        close(false);
                    }
                });
                input.addEventListener("blur", () => close(true));
                enableNativeTextMenu(input);
                activeRename = { close, input };
                focusTimer = setTimeout(() => {
                    focusTimer = 0;
                    if (done || !input.isConnected) return;
                    input.focus();
                    const n = input.value.length;
                    try { input.setSelectionRange(n, n); } catch (_) {}
                }, 0);
            };
            const syncColorDots = () => {
                const cat = this._tpb.categories.find((c) => c.id === this._tpb.activeCategoryId);
                const col = cat?.color || null;
                colorDots.forEach((d) => d.classList.toggle("active", col && d.dataset.color === col));
            };

            // Render functions
            const renderCategories = () => {
                catList.innerHTML = "";
                for (const cat of this._tpb.categories) {
                    const row = document.createElement("div");
                    row.className = "tpb-item" + (cat.id === this._tpb.activeCategoryId ? " active" : "");
                    const handle = document.createElement("span");
                    handle.className = "tpb-handle";
                    handle.textContent = "⋮⋮";
                    handle.title = "Drag to reorder";
                    const tag = document.createElement("span");
                    tag.className = "tpb-tag" + (cat.color ? "" : " empty");
                    tag.style.background = cat.color || "transparent";
                    tag.title = cat.color ? "Tag color " + cat.color : "No tag color";
                    const text = document.createElement("div");
                    text.className = "tpb-item-text";
                    text.textContent = cat.name;
                    text.title = "Double-click to rename";
                    const startEdit = (e) => {
                        e?.stopPropagation?.();
                        beginRename(text, (name) => {
                            cat.name = name;
                            fitCatWidth();
                            persist();
                        });
                    };
                    text.addEventListener("dblclick", startEdit);
                    text.addEventListener("pointerdown", (e) => e.stopPropagation());
                    text.addEventListener("keydown", (e) => e.stopPropagation());
                    enableNativeTextMenu(text);
                    if (cat._editing) {
                        delete cat._editing;
                        setTimeout(() => startEdit(), 30);
                    }

                    const pencil = document.createElement("button");
                    pencil.className = "tpb-pencil";
                    pencil.type = "button";
                    pencil.textContent = "✎";
                    pencil.title = "Rename category";
                    pencil.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit();
                    });
                    stopBtn(pencil);

                    const del = document.createElement("button");
                    del.className = "tpb-del";
                    del.type = "button";
                    del.textContent = "×";
                    del.title = "Delete category";
                    del.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm(`Delete category "${cat.name}"?`)) return;
                        this._tpb.categories = this._tpb.categories.filter((c) => c.id !== cat.id);
                        if (this._tpb.activeCategoryId === cat.id) {
                            this._tpb.activeCategoryId = this._tpb.categories[0]?.id || null;
                        }
                        renderAll();
                    });
                    stopBtn(del);

                    row.appendChild(handle);
                    row.appendChild(tag);
                    row.appendChild(text);
                    row.appendChild(pencil);
                    row.appendChild(del);
                    bindDrag(row, handle, cat.id, catList, (fromId, toId) => {
                        const arr = this._tpb.categories;
                        const from = arr.findIndex((c) => c.id === fromId);
                        const to = arr.findIndex((c) => c.id === toId);
                        if (from < 0 || to < 0) return;
                        const [moved] = arr.splice(from, 1);
                        arr.splice(to, 0, moved);
                        renderCategories();
                        persist();
                    });
                    row.addEventListener("click", (e) => {
                        if (e.target.closest(".tpb-del, .tpb-handle, .tpb-pencil")) return;
                        this._tpb.activeCategoryId = cat.id;
                        renderCategories();
                        renderItems();
                        syncColorDots();
                        persist();
                    });
                    catList.appendChild(row);
                }
                fitCatWidth();
            };

            const renderItems = () => {
                itemList.innerHTML = "";
                const cat = this._tpb.categories.find((c) => c.id === this._tpb.activeCategoryId);
                if (!cat) {
                    const empty = document.createElement("div");
                    empty.style.padding = "12px";
                    empty.style.color = "#666";
                    empty.style.fontSize = "11px";
                    empty.textContent = "Select a category";
                    itemList.appendChild(empty);
                    return;
                }
                for (const item of cat.items) {
                    const row = document.createElement("div");
                    row.className = "tpb-item";
                    const handle = document.createElement("span");
                    handle.className = "tpb-handle";
                    handle.textContent = "⋮⋮";
                    handle.title = "Drag to reorder";
                    const text = document.createElement("div");
                    text.className = "tpb-item-text";
                    text.textContent = item.text;
                    text.title = "Click to add • Double-click to edit";
                    text.addEventListener("dblclick", (e) => {
                        e.stopPropagation();
                        beginRename(text, (name) => {
                            item.text = name;
                            persist();
                        });
                    });
                    text.addEventListener("pointerdown", (e) => e.stopPropagation());
                    enableNativeTextMenu(text);

                    const pencil = document.createElement("button");
                    pencil.className = "tpb-pencil";
                    pencil.type = "button";
                    pencil.textContent = "✎";
                    pencil.title = "Rename snippet";
                    pencil.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        beginRename(text, (name) => {
                            item.text = name;
                            persist();
                        });
                    });
                    stopBtn(pencil);

                    const del = document.createElement("button");
                    del.className = "tpb-del";
                    del.type = "button";
                    del.textContent = "×";
                    del.title = "Delete item";
                    del.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!confirm(`Remove item "${item.text}"?`)) return;
                        cat.items = cat.items.filter((it) => it.id !== item.id);
                        renderItems();
                        persist();
                    });
                    stopBtn(del);

                    row.appendChild(handle);
                    row.appendChild(text);
                    row.appendChild(pencil);
                    row.appendChild(del);
                    bindDrag(row, handle, item.id, itemList, (fromId, toId) => {
                        const arr = cat.items;
                        const from = arr.findIndex((it) => it.id === fromId);
                        const to = arr.findIndex((it) => it.id === toId);
                        if (from < 0 || to < 0) return;
                        const [moved] = arr.splice(from, 1);
                        arr.splice(to, 0, moved);
                        renderItems();
                        persist();
                    });
                    row.addEventListener("click", (e) => {
                        if (e.target.closest(".tpb-del, .tpb-handle, .tpb-pencil") || text.contentEditable === "true") return;
                        this._tpb.selected.push({
                            id: uid(),
                            text: item.text,
                            categoryId: cat.id,
                            color: cat.color || null,
                        });
                        renderSelected();
                        updateOutput();
                    });
                    itemList.appendChild(row);
                }
            };

            const renderSelected = () => {
                selectedList.innerHTML = "";
                for (const snip of this._tpb.selected) {
                    const chip = document.createElement("div");
                    chip.className = "tpb-chip";
                    chip.draggable = true;
                    chip.title = "Drag to reorder";
                    const text = document.createElement("span");
                    text.className = "tpb-chip-text";
                    text.textContent = snip.text;
                    text.title = snip.text;
                    const del = document.createElement("button");
                    del.className = "tpb-chip-del";
                    del.type = "button";
                    del.textContent = "×";
                    del.title = "Remove";
                    del.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this._tpb.selected = this._tpb.selected.filter((s) => s.id !== snip.id);
                        renderSelected();
                        updateOutput();
                    });
                    stopBtn(del);
                    chip.addEventListener("dragstart", (e) => {
                        e.stopPropagation();
                        chip.classList.add("dragging");
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", snip.id);
                        selectedList._dragId = snip.id;
                    });
                    chip.addEventListener("dragend", () => {
                        chip.classList.remove("dragging");
                        selectedList.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
                        selectedList._dragId = null;
                    });
                    chip.addEventListener("dragover", (e) => {
                        if (!selectedList._dragId) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        chip.classList.add("drag-over");
                    });
                    chip.addEventListener("dragleave", () => chip.classList.remove("drag-over"));
                    chip.addEventListener("drop", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        chip.classList.remove("drag-over");
                        const fromId = selectedList._dragId;
                        if (!fromId || fromId === snip.id) return;
                        const arr = this._tpb.selected;
                        const from = arr.findIndex((s) => s.id === fromId);
                        const to = arr.findIndex((s) => s.id === snip.id);
                        if (from < 0 || to < 0) return;
                        const [moved] = arr.splice(from, 1);
                        arr.splice(to, 0, moved);
                        renderSelected();
                        updateOutput();
                    });
                    chip.appendChild(text);
                    chip.appendChild(del);
                    selectedList.appendChild(chip);
                }
            };

            const renderAll = () => {
                renderCategories();
                renderItems();
                renderSelected();
                syncColorDots();
                updateOutput();
            };

            // Buttons — isolate from canvas so clicks register
            const isolate = (el) => {
                el.addEventListener("pointerdown", (e) => e.stopPropagation());
                el.addEventListener("mousedown", (e) => e.stopPropagation());
            };
            [addCatBtn, addItemBtn, clearBtn, copyBtn, dbImportBtn, dbExportBtn, clearColorBtn, ...colorDots].forEach(isolate);
            root.addEventListener("pointerdown", (e) => e.stopPropagation());
            root.addEventListener("mousedown", (e) => e.stopPropagation());
            // Keep focus inside the widget so Comfy doesn't draw a blue node
            // outline or clear the header background.
            root.addEventListener("focusin", (e) => e.stopPropagation());
            root.addEventListener("focusout", (e) => e.stopPropagation());

            // Grab splitter — follow the pointer delta so it doesn't jump on grab
            let splitPtr = null;
            let splitStartX = 0;
            let splitStartW = 180;
            const onSplitMove = (e) => {
                if (splitPtr == null || e.pointerId !== splitPtr) return;
                e.preventDefault();
                e.stopPropagation();
                const layoutW = top.offsetWidth || 1;
                const scale = (top.getBoundingClientRect().width || layoutW) / layoutW || 1;
                const dx = (e.clientX - splitStartX) / scale;
                applyCatWidth(splitStartW + dx);
            };
            const onSplitUp = (e) => {
                if (splitPtr == null) return;
                if (e && e.pointerId != null && e.pointerId !== splitPtr) return;
                splitPtr = null;
                splitter.classList.remove("dragging");
                window.removeEventListener("pointermove", onSplitMove, true);
                window.removeEventListener("pointerup", onSplitUp, true);
                window.removeEventListener("pointercancel", onSplitUp, true);
                persist();
            };
            splitter.addEventListener("pointerdown", (e) => {
                if (e.button != null && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                splitPtr = e.pointerId;
                splitStartX = e.clientX;
                splitStartW = this._tpb.catWidth || left.offsetWidth || 180;
                splitter.classList.add("dragging");
                try { splitter.setPointerCapture(e.pointerId); } catch (_) {}
                window.addEventListener("pointermove", onSplitMove, true);
                window.addEventListener("pointerup", onSplitUp, true);
                window.addEventListener("pointercancel", onSplitUp, true);
            });
            splitter.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            // Wheel over a list scrolls that list; never zoom the canvas
            const bindListScroll = (list) => {
                list.addEventListener(
                    "wheel",
                    (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        list.scrollTop += e.deltaY;
                    },
                    { passive: false, capture: true }
                );
            };
            bindListScroll(catList);
            bindListScroll(itemList);
            bindListScroll(selectedList);

            // Color dots set the selected category's tag
            for (const dot of colorDots) {
                dot.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cat = this._tpb.categories.find((c) => c.id === this._tpb.activeCategoryId);
                    if (!cat) {
                        window.alert("Select a category first");
                        return;
                    }
                    cat.color = dot.dataset.color;
                    // Keep already-selected snippets in sync
                    for (const s of this._tpb.selected) {
                        if (s.categoryId === cat.id) s.color = cat.color;
                    }
                    colorDots.forEach((d) => d.classList.toggle("active", d.dataset.color === cat.color));
                    renderCategories();
                    updateOutput();
                });
            }

            clearColorBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cat = this._tpb.categories.find((c) => c.id === this._tpb.activeCategoryId);
                if (!cat) {
                    window.alert("Select a category first");
                    return;
                }
                cat.color = null;
                for (const s of this._tpb.selected) {
                    if (s.categoryId === cat.id) s.color = null;
                }
                syncColorDots();
                renderCategories();
                updateOutput();
            });

            addCatBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cat = { id: uid(), name: "New Category", items: [], color: null, _editing: true };
                this._tpb.categories.push(cat);
                this._tpb.activeCategoryId = cat.id;
                renderAll();
            });

            // + Item opens the list-import dialog
            addItemBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cat = this._tpb.categories.find((c) => c.id === this._tpb.activeCategoryId);
                if (!cat) {
                    window.alert("Select a category first");
                    return;
                }
                showListImportModal((lines) => {
                    for (const text of lines) {
                        cat.items.push({ id: uid(), text });
                    }
                    renderItems();
                    persist();
                });
            });

            clearBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tpb.selected = [];
                renderSelected();
                updateOutput();
            });

            copyBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = getWidget(this, "composed_prompt")?.value || "";
                try {
                    await navigator.clipboard.writeText(text);
                    const prev = copyBtn.textContent;
                    copyBtn.textContent = "Copied";
                    setTimeout(() => { copyBtn.textContent = prev; }, 900);
                } catch (_) {
                    window.prompt("Copy prompt:", text);
                }
            });

            // Full database export
            dbExportBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const json = databaseToBackupJson(this._tpb);
                downloadBackup(json);
            });

            // Full database import
            const dbFileInput = document.createElement("input");
            dbFileInput.type = "file";
            dbFileInput.accept = ".json,application/json";
            dbFileInput.style.display = "none";
            dbFileInput.addEventListener("change", () => {
                const file = dbFileInput.files && dbFileInput.files[0];
                dbFileInput.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsed = parseDatabaseBackup(String(reader.result || ""));
                        if (!parsed.categories.length) {
                            alert("No categories found in file.");
                            return;
                        }
                        const replace = confirm(
                            `Import ${parsed.categories.length} categor${parsed.categories.length === 1 ? "y" : "ies"}?\n\n` +
                            "OK = replace current database\nCancel = merge (add to existing)"
                        );
                        if (replace) {
                            this._tpb.categories = parsed.categories;
                            this._tpb.selected = parsed.selected;
                            this._tpb.activeCategoryId = parsed.categories[0]?.id || null;
                        } else {
                            this._tpb.categories.push(...parsed.categories);
                            if (!this._tpb.activeCategoryId && parsed.categories[0]) {
                                this._tpb.activeCategoryId = parsed.categories[0].id;
                            }
                        }
                        renderAll();
                    } catch (err) {
                        alert("Import failed: " + (err.message || err));
                    }
                };
                reader.onerror = () => alert("Failed to read file.");
                reader.readAsText(file);
            });
            root.appendChild(dbFileInput);

            dbImportBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                dbFileInput.click();
            });

            // Initial render
            renderAll();

            // Size — fixed so lists scroll instead of growing the node
            this.setSize?.([NODE_WIDTH, 460]);
            const initialW = Math.max(120, (this.size?.[0] || NODE_WIDTH) - 24);
            root.style.width = initialW + "px";
            root.style.maxWidth = initialW + "px";
            this._tpb.fitWidth?.();

            // On configure (load)
            const origOnConfigure = nodeType.prototype.onConfigure;
            this.onConfigure = function (info) {
                origOnConfigure?.apply(this, arguments);
                // Reload state after configure
                const w = getWidget(this, "builder_json");
                if (w && w.value && w.value !== "{}") {
                    try {
                        const data = JSON.parse(w.value);
                        if (Array.isArray(data.categories)) this._tpb.categories = data.categories;
                        if (data.activeCategoryId) this._tpb.activeCategoryId = data.activeCategoryId;
                        if (Array.isArray(data.selected)) this._tpb.selected = data.selected;
                        renderAll();
                    } catch (_) {}
                }
            };
        };

        // Resize fills the lists using a measured chrome offset so the handle
        // cannot feedback-grow the node (widget height = node height - chrome).
        const origOnResize = nodeType.prototype.onResize;
        nodeType.prototype.onResize = function (size) {
            origOnResize?.apply(this, arguments);
            const t = this._tpb;
            if (!t || t._syncing || !size || !size[0] || !size[1] || !t.lockedH || !t.root) return;

            const inner = Math.max(120, Math.round(size[0] - 24));
            t.root.style.width = inner + "px";
            t.root.style.maxWidth = inner + "px";
            t.root.style.minWidth = "0";
            t.root.style.overflow = "hidden";
            t.root.style.boxSizing = "border-box";
            if (typeof t.fitWidth === "function") t.fitWidth();

            if (t.chrome == null) {
                t.chrome = Math.max(0, size[1] - t.lockedH);
                t.lastNodeH = size[1];
                return;
            }
            if (Math.abs(size[1] - t.lastNodeH) < 1) return;
            const widgetH = Math.max(300, Math.round(size[1] - t.chrome));
            t.lastNodeH = size[1];
            if (Math.abs(widgetH - t.lockedH) < 1) return;
            t._syncing = true;
            t.lockedH = widgetH;
            t.root.style.height = widgetH + "px";
            t.root.style.maxHeight = widgetH + "px";
            if (t.domWidget) t.domWidget.computedHeight = widgetH;
            t._syncing = false;
        };
    },
});
