import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Temporary stub — replace with full reference_loader.js from
// artifacts/tallron/js/reference_loader.js (per-slot crop UI).
// Node backend is already updated on this branch.

const NODE_NAME = "TallronReferenceImageLoader";
const MAX_SLOTS = 10;

app.registerExtension({
  name: "Tallron.ReferenceImageLoader",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name !== NODE_NAME) return;
    console.warn(
      "[Tallron] reference_loader.js is a temporary stub. Copy the full " +
      "file from the project artifacts (per-slot crop) into js/reference_loader.js"
    );
    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated?.apply(this, arguments);
      const note = document.createElement("div");
      note.style.cssText = "padding:8px;color:#faa;font-size:11px;";
      note.textContent =
        "Update js/reference_loader.js from the Tallron package (crop UI).";
      try {
        this.addDOMWidget("ril_note", "div", note, { serialize: false });
      } catch (_) {}
      return r;
    };
  },
});
