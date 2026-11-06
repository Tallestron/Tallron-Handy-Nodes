import { app } from "../../scripts/app.js";

const NODE_NAME = "TallronNoteList";
const NODE_WIDTH = 340;
const LIST_MIN_H = 180;
const LIST_MAX_H = 720;
const ROW_COLLAPSED_H = 36;
const ROW_BODY_CHROME = 40; // actions row + padding when expanded
const TEXTAREA_MIN_H = 48;
const TEXTAREA_MAX_H = 400;

// ---------------------------------------------------------------------------
// CSS (injected once)
// ---------------------------------------------------------------------------
function injectCSS() {
    if (document.getElementById("tallron-note-list-css")) return;
    const style = document.createElement("style");
    style.id = "tallron-note-list-css";
    style.textContent = `
.tnl-root {
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
.tnl-title,
.tnl-content {
    user-select: text;
    -webkit-user-select: text;
}
.tnl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: #252525;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
}
.tnl-header-title {
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: #ccc;
}
.tnl-add-btn {
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
.tnl-add-btn:hover { background: #4a8be5; }
.tnl-add-btn:active { background: #2a6bc5; }

.tnl-list {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
}
.tnl-list::-webkit-scrollbar { width: 6px; }
.tnl-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

.tnl-row {
    display: flex;
    flex-direction: column;
    background: #222;
    border: 1px solid #333;
    border-radius: 5px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
}
.tnl-row.dragging {
    opacity: 0.45;
    border-color: #5BA3F5;
}
.tnl-row.drag-over {
    border-color: #5BA3F5;
    box-shadow: 0 0 0 1px #5BA3F5;
}
.tnl-row.active-output {
    border-color: #3a9a5a;
    box-shadow: 0 0 0 1px #3a9a5a, inset 0 0 0 1px rgba(58, 154, 90, 0.25);
    background: #1e2a22;
}

.tnl-row-head {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    min-height: ${ROW_COLLAPSED_H - 8}px;
    cursor: default;
}
.tnl-handle {
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
.tnl-handle:hover { color: #aaa; background: #333; }
.tnl-handle:active { cursor: grabbing; }

.tnl-expand {
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
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.tnl-expand:hover {
    background: #333;
    color: #fff;
    border-color: #666;
}
.tnl-expand.open {
    background: #2a4a6a;
    border-color: #5BA3F5;
    color: #8ec8ff;
}

.tnl-title {
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
.tnl-title[readonly] {
    cursor: default;
}
.tnl-title:not([readonly]):hover { border-color: #444; }
.tnl-title:not([readonly]):focus {
    border-color: #5BA3F5;
    background: #1a1a1a;
    cursor: text;
}
.tnl-title.editing {
    border-color: #5BA3F5;
    background: #1a1a1a;
    cursor: text;
}

.tnl-output-head {
    flex: 0 0 auto;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #2a5a3a;
    border: 1px solid #3a7a4a;
    border-radius: 4px;
    color: #b8e0c0;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    padding: 0 7px;
    line-height: 1;
    white-space: nowrap;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tnl-output-head:hover {
    background: #346a44;
    border-color: #4a9a5a;
    color: #fff;
}
.tnl-output-head.active {
    background: #1a4a2a;
    border-color: #2a7a3a;
    color: #c8f0d0;
}

.tnl-delete {
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
.tnl-delete:hover { color: #e55; background: #3a2222; }

.tnl-body {
    display: none;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px 8px 28px;
    border-top: 1px solid #2a2a2a;
}
.tnl-body.open {
    display: flex;
}

.tnl-content {
    width: 100%;
    min-height: ${TEXTAREA_MIN_H}px;
    max-height: ${TEXTAREA_MAX_H}px;
    resize: none;
    overflow-y: hidden;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    color: #ddd;
    font-size: 12px;
    font-family: inherit;
    padding: 6px 8px;
    box-sizing: border-box;
    outline: none;
    line-height: 1.4;
}
.tnl-content:focus { border-color: #5BA3F5; }

.tnl-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
}
.tnl-btn {
    background: #333;
    color: #ccc;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tnl-btn:hover { background: #3a3a3a; border-color: #555; color: #fff; }
.tnl-btn:active { background: #2a2a2a; }
.tnl-empty {
    padding: 24px 12px;
    text-align: center;
    color: #666;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-line;
}

.tnl-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding: 6px 10px;
    background: #252525;
    border-top: 1px solid #333;
    flex-shrink: 0;
}
.tnl-footer-btn {
    background: #333;
    color: #ccc;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tnl-footer-btn:hover { background: #3a3a3a; border-color: #555; color: #fff; }
.tnl-footer-btn:active { background: #2a2a2a; }
`;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
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

/** Parse notes_json → { notes, activeId }. Accepts legacy plain array. */
function readState(node) {
    const w = getWidget(node, "notes_json");
    let raw = null;
    try {
        raw = JSON.parse(w?.value || "[]");
    } catch (_) {
        raw = [];
    }

    let notes = [];
    let activeId = null;

    if (Array.isArray(raw)) {
        notes = raw;
    } else if (raw && typeof raw === "object") {
        notes = Array.isArray(raw.notes) ? raw.notes : [];
        activeId = raw.activeId || null;
    }

    notes = notes.map((n) => ({
        id: n.id || uid(),
        title: typeof n.title === "string" ? n.title : "Untitled",
        content: typeof n.content === "string" ? n.content : "",
        expanded: !!n.expanded,
    }));

    return { notes, activeId };
}

function writeState(node, notes, activeId) {
    const w = getWidget(node, "notes_json");
    if (!w) return;
    w.value = JSON.stringify({ notes, activeId: activeId || null });
    if (w.callback) w.callback(w.value, app.canvas, node);
    node.setDirtyCanvas?.(true, true);
}

function setSelectedNote(node, text) {
    const w = getWidget(node, "selected_note");
    if (!w) return;
    w.value = text ?? "";
    if (w.callback) w.callback(w.value, app.canvas, node);
    node.setDirtyCanvas?.(true, true);
}

/** Grow textarea to fit content (capped). */
function autosizeTextarea(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(
        TEXTAREA_MAX_H,
        Math.max(TEXTAREA_MIN_H, ta.scrollHeight)
    );
    ta.style.height = h + "px";
    ta.style.overflowY = ta.scrollHeight > TEXTAREA_MAX_H ? "auto" : "hidden";
}

/**
 * Let the browser show its native text context menu (Cut / Copy / Paste /
 * spelling suggestions) instead of the ComfyUI/LiteGraph menu.
 */
function enableNativeTextMenu(el) {
    if (!el) return;
    el.addEventListener("contextmenu", (e) => {
        // Stop LiteGraph / Comfy from taking the event; do NOT preventDefault
        // so the OS/browser menu (with spellcheck) still appears.
        e.stopPropagation();
    });
}

const NOTES_BACKUP_FORMAT = "tallron-notes";
const NOTES_BACKUP_VERSION = 1;

function notesToBackupJson(notes) {
    return JSON.stringify(
        {
            format: NOTES_BACKUP_FORMAT,
            version: NOTES_BACKUP_VERSION,
            exported: new Date().toISOString(),
            notes: (notes || []).map((n) => ({
                title: n.title || "",
                content: n.content || "",
            })),
        },
        null,
        2
    );
}

/** Parse backup JSON or a simple Markdown export. Returns note objects. */
function parseBackupText(text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return [];

    // JSON path
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        let data;
        try {
            data = JSON.parse(trimmed);
        } catch (_) {
            throw new Error("Invalid JSON backup file.");
        }
        let list = [];
        if (Array.isArray(data)) {
            list = data;
        } else if (data && typeof data === "object") {
            if (Array.isArray(data.notes)) list = data.notes;
            else throw new Error("JSON backup has no notes array.");
        }
        return list.map((n) => ({
            id: uid(),
            title:
                typeof n.title === "string"
                    ? n.title
                    : typeof n.name === "string"
                      ? n.name
                      : "Untitled",
            content: typeof n.content === "string" ? n.content : "",
            expanded: false,
        }));
    }

    // Markdown-ish: blocks separated by --- , titles as # heading
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
        out.push({ id: uid(), title, content, expanded: false });
    }
    return out;
}

async function downloadBackup(jsonText, filename) {
    const name = filename || `tallron-notes-${dateStamp()}.json`;
    const blob = new Blob([jsonText], { type: "application/json" });

    if (typeof window.showSaveFilePicker === "function") {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: name,
                types: [
                    {
                        description: "Tallron Notes backup",
                        accept: { "application/json": [".json"] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            // User cancelled or API unavailable mid-flight — fall through
            if (err && err.name === "AbortError") return;
        }
    }

    // Fallback: anchor download
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

function dateStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------
app.registerExtension({
    name: "Tallron.NoteList",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== NODE_NAME) return;

        injectCSS();

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);

            this._tnl = {
                notes: [],
                activeId: null,
                root: null,
                listEl: null,
                domWidget: null,
                dragId: null,
            };

            hideWidget(this, "notes_json");
            hideWidget(this, "selected_note");

            this._tnlBuildUI();
            this._tnlLoadAndRender();

            if (!this.size || this.size[0] < 280) {
                this.setSize?.([NODE_WIDTH, 320]);
            }

            const origOnConfigure = this.onConfigure;
            this.onConfigure = function (info) {
                const r2 = origOnConfigure?.apply(this, arguments);
                setTimeout(() => {
                    hideWidget(this, "notes_json");
                    hideWidget(this, "selected_note");
                    this._tnlLoadAndRender();
                }, 40);
                return r2;
            };

            setTimeout(() => {
                hideWidget(this, "notes_json");
                hideWidget(this, "selected_note");
                this._tnlLoadAndRender();
            }, 80);

            return r;
        };

        // ----- UI construction -----
        nodeType.prototype._tnlBuildUI = function () {
            if (this._tnl.root) return;

            const root = document.createElement("div");
            root.className = "tnl-root";

            const header = document.createElement("div");
            header.className = "tnl-header";
            const title = document.createElement("span");
            title.className = "tnl-header-title";
            title.textContent = "Notes";
            const addBtn = document.createElement("button");
            addBtn.className = "tnl-add-btn";
            addBtn.textContent = "+ Add Note";
            addBtn.type = "button";
            addBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlAddNote();
            });
            header.appendChild(title);
            header.appendChild(addBtn);
            root.appendChild(header);

            const list = document.createElement("div");
            list.className = "tnl-list";
            root.appendChild(list);

            list.addEventListener(
                "wheel",
                (e) => {
                    e.stopPropagation();
                },
                { passive: true }
            );

            // Footer: Import / Export
            const footer = document.createElement("div");
            footer.className = "tnl-footer";

            const importBtn = document.createElement("button");
            importBtn.className = "tnl-footer-btn";
            importBtn.type = "button";
            importBtn.textContent = "Import";
            importBtn.title = "Import notes from a JSON (or Markdown) backup";
            importBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlImport();
            });
            footer.appendChild(importBtn);

            const exportBtn = document.createElement("button");
            exportBtn.className = "tnl-footer-btn";
            exportBtn.type = "button";
            exportBtn.textContent = "Export";
            exportBtn.title = "Export notes to a JSON backup file";
            exportBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlExport();
            });
            footer.appendChild(exportBtn);

            root.appendChild(footer);

            // Hidden file input for Import
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".json,.md,.txt,application/json,text/markdown,text/plain";
            fileInput.style.display = "none";
            fileInput.addEventListener("change", () => {
                const file = fileInput.files && fileInput.files[0];
                fileInput.value = "";
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const imported = parseBackupText(String(reader.result || ""));
                        if (!imported.length) {
                            window.alert("No notes found in that file.");
                            return;
                        }
                        const replace = window.confirm(
                            `Import ${imported.length} note(s).\n\n` +
                                `OK — replace all current notes\n` +
                                `Cancel — append to the existing list`
                        );
                        if (replace) {
                            this._tnl.notes = imported;
                            this._tnl.activeId = null;
                            setSelectedNote(this, "");
                        } else {
                            this._tnl.notes = this._tnl.notes.concat(imported);
                        }
                        this._tnlPersist();
                        this._tnlRender();
                    } catch (err) {
                        window.alert(err?.message || "Failed to import notes.");
                    }
                };
                reader.readAsText(file);
            });
            root.appendChild(fileInput);
            this._tnl.fileInput = fileInput;

            const FOOTER_H = 36;
            const domWidget = this.addDOMWidget("note_list_ui", "div", root, {
                serialize: false,
            });

            domWidget.computeSize = () => {
                const w = this.size?.[0] || NODE_WIDTH;
                const notes = this._tnl?.notes || [];
                let h = 40 + FOOTER_H; // header + footer
                if (notes.length === 0) {
                    h += 80;
                } else {
                    for (const n of notes) {
                        h += ROW_COLLAPSED_H;
                        if (n.expanded) {
                            const lines = Math.max(
                                2,
                                (n.content || "").split("\n").length
                            );
                            const estTa = Math.min(
                                TEXTAREA_MAX_H,
                                Math.max(TEXTAREA_MIN_H, lines * 17 + 16)
                            );
                            h += ROW_BODY_CHROME + estTa;
                        }
                    }
                    h += 12;
                }
                h = Math.max(LIST_MIN_H + FOOTER_H, Math.min(LIST_MAX_H, h));
                return [w - 20, h];
            };
            domWidget.computedHeight = LIST_MIN_H;

            this._tnl.root = root;
            this._tnl.listEl = list;
            this._tnl.domWidget = domWidget;
        };

        nodeType.prototype._tnlExport = async function () {
            const json = notesToBackupJson(this._tnl.notes);
            await downloadBackup(json);
        };

        nodeType.prototype._tnlImport = function () {
            const input = this._tnl.fileInput;
            if (input) input.click();
        };

        nodeType.prototype._tnlLoadAndRender = function () {
            const state = readState(this);
            this._tnl.notes = state.notes;
            this._tnl.activeId = state.activeId;
            this._tnlRender();
        };

        nodeType.prototype._tnlPersist = function () {
            writeState(this, this._tnl.notes, this._tnl.activeId);
            this._tnlUpdateSize();
        };

        nodeType.prototype._tnlUpdateSize = function () {
            const dw = this._tnl.domWidget;
            if (!dw) return;
            // Prefer measuring real expanded textareas after layout
            requestAnimationFrame(() => {
                const size = dw.computeSize();
                // Refine height from actual DOM if available
                let measured = 40;
                const rows = this._tnl.listEl?.querySelectorAll(".tnl-row");
                if (rows && rows.length) {
                    rows.forEach((row) => {
                        measured += row.offsetHeight + 4; // gap
                    });
                    measured += 12;
                    measured = Math.max(LIST_MIN_H, Math.min(LIST_MAX_H, measured));
                    dw.computedHeight = measured;
                } else {
                    dw.computedHeight = size[1];
                }
                this.setSize?.([this.size?.[0] || NODE_WIDTH, this.size?.[1] || 320]);
                this.setDirtyCanvas?.(true, true);
            });
        };

        nodeType.prototype._tnlAddNote = function () {
            const note = {
                id: uid(),
                title: "New Note",
                content: "",
                expanded: true,
            };
            this._tnl.notes.unshift(note);
            this._tnlPersist();
            this._tnlRender();
            // New notes open in title-edit mode once
            requestAnimationFrame(() => {
                const input = this._tnl.listEl?.querySelector(
                    `.tnl-row[data-id="${note.id}"] .tnl-title`
                );
                if (input) {
                    this._tnlBeginTitleEdit(input, note.id);
                }
            });
        };

        nodeType.prototype._tnlDeleteNote = function (id) {
            const n = this._tnl.notes.find((x) => x.id === id);
            const label = n?.title?.trim() || "Untitled";
            if (!window.confirm(`Delete note “${label}”?`)) return;

            this._tnl.notes = this._tnl.notes.filter((x) => x.id !== id);
            if (this._tnl.activeId === id) {
                this._tnl.activeId = null;
                setSelectedNote(this, "");
            }
            this._tnlPersist();
            this._tnlRender();
        };

        nodeType.prototype._tnlToggleExpand = function (id) {
            const n = this._tnl.notes.find((x) => x.id === id);
            if (!n) return;
            n.expanded = !n.expanded;
            this._tnlPersist();
            this._tnlRender();
        };

        nodeType.prototype._tnlUpdateField = function (id, field, value) {
            const n = this._tnl.notes.find((x) => x.id === id);
            if (!n) return;
            n[field] = value;
            writeState(this, this._tnl.notes, this._tnl.activeId);
            // If this is the active output note and content changed, refresh output
            if (field === "content" && this._tnl.activeId === id) {
                setSelectedNote(this, value);
            }
        };

        nodeType.prototype._tnlOutput = function (id, btn) {
            const n = this._tnl.notes.find((x) => x.id === id);
            if (!n) return;
            this._tnl.activeId = id;
            setSelectedNote(this, n.content);
            writeState(this, this._tnl.notes, this._tnl.activeId);
            // Re-render so only this row has the active border
            this._tnlRender();
        };

        nodeType.prototype._tnlCopy = async function (id, btn) {
            const n = this._tnl.notes.find((x) => x.id === id);
            if (!n) return;
            try {
                await navigator.clipboard.writeText(n.content || "");
                if (btn) {
                    const prev = btn.textContent;
                    btn.textContent = "Copied ✓";
                    setTimeout(() => {
                        btn.textContent = prev;
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
                        setTimeout(() => {
                            btn.textContent = prev;
                        }, 1200);
                    }
                } catch (_) {
                    /* ignore */
                }
                document.body.removeChild(ta);
            }
        };

        nodeType.prototype._tnlBeginTitleEdit = function (input, id) {
            input.readOnly = false;
            input.classList.add("editing");
            input.focus();
            input.select();
        };

        nodeType.prototype._tnlEndTitleEdit = function (input, id) {
            input.readOnly = true;
            input.classList.remove("editing");
            this._tnlUpdateField(id, "title", input.value);
        };

        // ----- Render -----
        nodeType.prototype._tnlRender = function () {
            const list = this._tnl.listEl;
            if (!list) return;
            list.innerHTML = "";

            const notes = this._tnl.notes;
            if (notes.length === 0) {
                const empty = document.createElement("div");
                empty.className = "tnl-empty";
                empty.textContent =
                    "No notes yet.\nClick “+ Add Note” to create one.";
                list.appendChild(empty);
                this._tnlUpdateSize();
                return;
            }

            for (const note of notes) {
                list.appendChild(this._tnlCreateRow(note));
            }
            this._tnlUpdateSize();
            // Autosize expanded textareas after they are in the DOM
            requestAnimationFrame(() => {
                list.querySelectorAll(".tnl-content").forEach((ta) => {
                    if (ta.closest(".tnl-body.open")) autosizeTextarea(ta);
                });
                this._tnlUpdateSize();
            });
        };

        nodeType.prototype._tnlCreateRow = function (note) {
            const row = document.createElement("div");
            row.className =
                "tnl-row" +
                (this._tnl.activeId === note.id ? " active-output" : "");
            row.dataset.id = note.id;
            row.draggable = false;

            // --- head ---
            const head = document.createElement("div");
            head.className = "tnl-row-head";

            const handle = document.createElement("div");
            handle.className = "tnl-handle";
            handle.title = "Drag to reorder";
            handle.innerHTML = "⋮⋮";
            handle.draggable = true;
            this._tnlBindDrag(handle, row, note.id);
            head.appendChild(handle);

            const expandBtn = document.createElement("button");
            expandBtn.className = "tnl-expand" + (note.expanded ? " open" : "");
            expandBtn.type = "button";
            expandBtn.title = note.expanded ? "Collapse" : "Expand";
            expandBtn.textContent = note.expanded ? "−" : "+";
            expandBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlToggleExpand(note.id);
            });
            head.appendChild(expandBtn);

            // Title — readonly until double-click
            const titleInput = document.createElement("input");
            titleInput.className = "tnl-title";
            titleInput.type = "text";
            titleInput.value = note.title;
            titleInput.placeholder = "Note name";
            titleInput.spellcheck = false;
            titleInput.readOnly = true;
            titleInput.title = "Double-click to rename";

            titleInput.addEventListener("dblclick", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlBeginTitleEdit(titleInput, note.id);
            });
            titleInput.addEventListener("blur", () => {
                if (!titleInput.readOnly) {
                    this._tnlEndTitleEdit(titleInput, note.id);
                }
            });
            titleInput.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                    e.preventDefault();
                    titleInput.blur();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    titleInput.value = note.title;
                    titleInput.readOnly = true;
                    titleInput.classList.remove("editing");
                    titleInput.blur();
                }
            });
            titleInput.addEventListener("mousedown", (e) => {
                // Allow selection only while editing; otherwise don't steal drag
                if (titleInput.readOnly) e.preventDefault();
                e.stopPropagation();
            });
            enableNativeTextMenu(titleInput);
            head.appendChild(titleInput);

            // Output — always visible in the title row (no expand needed)
            const outputBtn = document.createElement("button");
            outputBtn.className =
                "tnl-output-head" +
                (this._tnl.activeId === note.id ? " active" : "");
            outputBtn.type = "button";
            outputBtn.textContent =
                this._tnl.activeId === note.id ? "Output ✓" : "Output";
            outputBtn.title = "Set this note as the STRING output";
            outputBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlOutput(note.id, outputBtn);
            });
            head.appendChild(outputBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "tnl-delete";
            delBtn.type = "button";
            delBtn.title = "Delete note";
            delBtn.textContent = "×";
            delBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlDeleteNote(note.id);
            });
            head.appendChild(delBtn);

            row.appendChild(head);

            // --- body ---
            const body = document.createElement("div");
            body.className = "tnl-body" + (note.expanded ? " open" : "");

            const textarea = document.createElement("textarea");
            textarea.className = "tnl-content";
            textarea.value = note.content;
            textarea.placeholder = "Write your note…";
            textarea.spellcheck = true;
            textarea.addEventListener("input", () => {
                this._tnlUpdateField(note.id, "content", textarea.value);
                autosizeTextarea(textarea);
                this._tnlUpdateSize();
            });
            textarea.addEventListener("keydown", (e) => e.stopPropagation());
            textarea.addEventListener("mousedown", (e) => e.stopPropagation());
            textarea.addEventListener("wheel", (e) => e.stopPropagation(), {
                passive: true,
            });
            enableNativeTextMenu(textarea);
            body.appendChild(textarea);

            const actions = document.createElement("div");
            actions.className = "tnl-actions";

            const copyBtn = document.createElement("button");
            copyBtn.className = "tnl-btn";
            copyBtn.type = "button";
            copyBtn.textContent = "Copy";
            copyBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._tnlCopy(note.id, copyBtn);
            });
            actions.appendChild(copyBtn);

            body.appendChild(actions);
            row.appendChild(body);

            return row;
        };

        // ----- Drag & drop reorder -----
        nodeType.prototype._tnlBindDrag = function (handle, row, id) {
            handle.addEventListener("dragstart", (e) => {
                this._tnl.dragId = id;
                row.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
                requestAnimationFrame(() => row.classList.add("dragging"));
            });

            handle.addEventListener("dragend", () => {
                this._tnl.dragId = null;
                row.classList.remove("dragging");
                this._tnl.listEl
                    ?.querySelectorAll(".tnl-row.drag-over")
                    .forEach((el) => el.classList.remove("drag-over"));
            });

            row.addEventListener("dragover", (e) => {
                if (!this._tnl.dragId || this._tnl.dragId === id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                row.classList.add("drag-over");
            });

            row.addEventListener("dragleave", () => {
                row.classList.remove("drag-over");
            });

            row.addEventListener("drop", (e) => {
                e.preventDefault();
                row.classList.remove("drag-over");
                const fromId = this._tnl.dragId;
                if (!fromId || fromId === id) return;

                const notes = this._tnl.notes;
                const fromIdx = notes.findIndex((n) => n.id === fromId);
                const toIdx = notes.findIndex((n) => n.id === id);
                if (fromIdx < 0 || toIdx < 0) return;

                const [item] = notes.splice(fromIdx, 1);
                notes.splice(toIdx, 0, item);
                this._tnlPersist();
                this._tnlRender();
            });
        };
    },
});
