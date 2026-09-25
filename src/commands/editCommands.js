import { canvasToBlob } from '../utils/canvas.js';
import { intersectRect } from '../utils/math.js';
import { extractRegion, placeImageAsLayer } from './helpers.js';

export function editCommands(app) {
  const fillRegion = (color, label) => {
    const doc = app.doc;
    const r = doc.region;
    const ctx = doc.activeLayer.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    app.commit(label);
  };

  const copy = () => {
    const doc = app.doc;
    const rect = intersectRect(doc.region, doc.bounds);
    if (!rect) return false;
    const canvas = extractRegion(doc.activeLayer, rect);
    app.clipboard = { canvas, x: rect.x, y: rect.y };
    // Mirror to the system clipboard when the browser allows it.
    try {
      navigator.clipboard?.write?.([new ClipboardItem({ 'image/png': canvasToBlob(canvas) })]).catch(() => {});
    } catch {
      /* unsupported */
    }
    return true;
  };

  return {
    undo: () => {
      if (!app.activeTool.revertPending()) app.history.undo();
    },
    redo: () => app.history.redo(),

    copy() {
      if (copy()) app.toast('Copied');
    },

    cut() {
      if (!copy()) return;
      const r = app.doc.region;
      app.doc.activeLayer.erase(r.x, r.y, r.w, r.h);
      app.commit('Cut');
    },

    paste() {
      if (!app.clipboard) {
        app.toast('Nothing to paste');
        return;
      }
      const { canvas, x, y } = app.clipboard;
      placeImageAsLayer(app, canvas, 'Pasted Layer', { x, y });
    },

    clearSelection() {
      const sel = app.doc.selection;
      if (!sel) {
        app.toast('Make a selection first');
        return;
      }
      app.doc.activeLayer.erase(sel.x, sel.y, sel.w, sel.h);
      app.commit('Clear');
    },

    fillPrimary: () => fillRegion(app.colors.primary, 'Fill'),
    fillSecondary: () => fillRegion(app.colors.secondary, 'Fill'),
  };
}
