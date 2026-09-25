import { canvasToBlob, clipToSelection } from '../utils/canvas.js';
import { intersectRect } from '../utils/math.js';
import { extractSelection } from '../selection/index.js';
import { extractRegion, placeImageAsLayer } from './helpers.js';

export function editCommands(app) {
  const fillRegion = (color, label) => {
    const doc = app.doc;
    const r = doc.region;
    const ctx = doc.activeLayer.ctx;
    ctx.save();
    clipToSelection(ctx, doc.selection);
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    app.commit(label);
  };

  const copy = () => {
    const doc = app.doc;
    const sel = doc.selection;
    if (!intersectRect(doc.region, doc.bounds)) return false;
    const canvas = sel ? extractSelection(doc.activeLayer.canvas, sel) : extractRegion(doc.activeLayer, doc.bounds);
    app.clipboard = { canvas, x: sel?.x ?? 0, y: sel?.y ?? 0 };
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
      app.doc.activeLayer.erase(app.doc.region);
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
      app.doc.activeLayer.erase(sel);
      app.commit('Clear');
    },

    fillPrimary: () => fillRegion(app.colors.primary, 'Fill'),
    fillSecondary: () => fillRegion(app.colors.secondary, 'Fill'),
  };
}
