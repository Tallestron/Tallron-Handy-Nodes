import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_NAME = "TallronReferenceImageLoader";
const MAX_SLOTS = 10;

const NODE_WIDTH = 440;
const CONTROLS_HEIGHT = 130;   // extra room for index_style widget
const GRID_PAD = 12;
const GAP = 8;
const MIN_CELL = 90;
const MAX_CELL = 160;

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

        /** Display label for slot index 0..9 */
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

        function getPreviewUrl(filename) {
            if (!filename || !String(filename).trim()) return null;
            return api.apiURL(
                `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=&rand=${Date.now()}`
            );
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

        // ---------- lifecycle ----------
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated?.apply(this, arguments);

            this._slots = [];
            this._slotLabels = [];
            this._previewImgs = [];
            this._placeholders = [];
            this._gridContainer = null;
            this._gridWidget = null;
            this._activeCount = 10;
            this._autoSizing = false;

            this._hideJsonWidget();
            this._buildGrid();

            const numW = getWidget(this, "num_slots");
            const n = numW ? parseInt(numW.value, 10) || 10 : 10;
            this._activeCount = n;
            this._resizeToSlots(n, true);
            this._applySlotCount(false);
            this._applyIndexStyle();
            this._syncAllPreviews();

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
                    let cell = Math.floor(((size?.[0] || NODE_WIDTH) - GRID_PAD * 2 - GAP) / 2);
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
                    const numW2 = getWidget(this, "num_slots");
                    const n2 = numW2 ? parseInt(numW2.value, 10) || 10 : 10;
                    this._activeCount = n2;
                    this._applySlotCount(false);
                    this._resizeToSlots(n2, true);
                    this._applyIndexStyle();
                    this._syncAllPreviews();
                }, 40);
                return r3;
            };

            setTimeout(() => {
                this._hideJsonWidget();
                const numW3 = getWidget(this, "num_slots");
                const n3 = numW3 ? parseInt(numW3.value, 10) || 10 : 10;
                this._resizeToSlots(n3, true);
                this._applySlotCount(false);
                this._applyIndexStyle();
                this._syncAllPreviews();
            }, 80);

            return r;
        };

        /** Rename cell headers + output sockets for Qwen (1…) vs Flux (0…). */
        nodeType.prototype._applyIndexStyle = function () {
            const flux = isFluxStyle(this);

            // Cell headers
            for (let i = 0; i < MAX_SLOTS; i++) {
                const labelEl = this._slotLabels[i];
                if (labelEl) {
                    labelEl.textContent = slotLabel(this, i);
                }
            }

            // Output socket display names (first 10 are the image slots)
            if (this.outputs && this.outputs.length >= 10) {
                for (let i = 0; i < 10; i++) {
                    const name = flux ? `Image ${i}` : `Image ${i + 1}`;
                    this.outputs[i].name = name;
                    // Some Comfy builds also keep a localized_name
                    if (this.outputs[i].localized_name !== undefined) {
                        this.outputs[i].localized_name = name;
                    }
                }
                // Full-size output label follows the same style for slot 0/1
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
            domWidget.computedHeight = rows0 * cell0 + (rows0 - 1) * GAP + GRID_PAD * 2;

            this._gridWidget = domWidget;
            this._gridContainer = container;
            this._updateGridSize();
        };

        nodeType.prototype._createSlot = function (index) {
            // index is 1-based slot position (1..10); zero-based is index-1
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
                transition: border-color 0.15s, background 0.15s;
                aspect-ratio: 1 / 1;
            `;
            this._slots[index - 1] = slot;

            const header = document.createElement("div");
            header.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 2px 6px; background: #2e2e2e; flex-shrink: 0;
                font-size: 11px; font-weight: 600; color: #bbb; user-select: none;
            `;
            const label = document.createElement("span");
            label.textContent = `Image ${index}`; // updated later by _applyIndexStyle
            header.appendChild(label);
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
            });
            header.appendChild(clearBtn);
            slot.appendChild(header);

            const preview = document.createElement("div");
            preview.style.cssText = `
                flex: 1; display: flex; align-items: center; justify-content: center;
                background: #111; overflow: hidden; position: relative;
                min-height: 40px; cursor: pointer;
            `;

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
                e.stopPropagation();
                fileInput.click();
            });
            preview.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.style.borderColor = "#5a9";
                slot.style.background = "#2a3a2a";
            });
            preview.addEventListener("dragleave", (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.style.borderColor = "#3a3a3a";
                slot.style.background = "#252525";
            });
            preview.addEventListener("drop", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.style.borderColor = "#3a3a3a";
                slot.style.background = "#252525";
                const file = e.dataTransfer?.files?.[0];
                if (file && file.type.startsWith("image/")) {
                    await this._handleFile(index, file);
                }
            });

            slot.appendChild(preview);
            return slot;
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
                this._gridContainer.style.gridTemplateRows = `repeat(${Math.ceil(n / 2)}, 1fr)`;
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
