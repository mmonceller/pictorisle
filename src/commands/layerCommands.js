import { contentBounds } from '../utils/bounds.js';
import { intersectRect } from '../utils/math.js';
import { extractRegion } from './helpers.js';

export function layerCommands(app) {
  /** Mirrors the layer's content (or the selected part) in place around its own center. */
  const flipLayer = (axis) => {
    const doc = app.doc;
    const layer = doc.activeLayer;
    const b = contentBounds(layer.canvas, doc.selection);
    if (!b) {
      app.toast('Nothing to flip on this layer');
      return;
    }
    const source = extractRegion(layer, b);
    const ctx = layer.ctx;
    ctx.clearRect(b.x, b.y, b.w, b.h);
    ctx.save();
    if (axis === 'x') ctx.setTransform(-1, 0, 0, 1, 2 * b.x + b.w, 0);
    else ctx.setTransform(1, 0, 0, -1, 0, 2 * b.y + b.h);
    ctx.drawImage(source, b.x, b.y);
    ctx.restore();
    app.commit(axis === 'x' ? 'Flip Layer Horizontal' : 'Flip Layer Vertical');
  };

  return {
    newLayer() {
      const doc = app.doc;
      doc.addLayer(doc.createLayer());
      app.commit('New Layer', []);
    },

    duplicateLayer() {
      const doc = app.doc;
      doc.addLayer(doc.activeLayer.duplicate());
      app.commit('Duplicate Layer', []);
    },

    deleteLayer() {
      if (!app.doc.removeLayer()) {
        app.toast('A document needs at least one layer');
        return;
      }
      app.commit('Delete Layer', []);
    },

    moveLayerUp() {
      const doc = app.doc;
      if (doc.moveLayer(doc.activeIndex, doc.activeIndex + 1)) app.commit('Move Layer Up', []);
    },

    moveLayerDown() {
      const doc = app.doc;
      if (doc.moveLayer(doc.activeIndex, doc.activeIndex - 1)) app.commit('Move Layer Down', []);
    },

    mergeDown() {
      if (!app.doc.mergeDown()) {
        app.toast('There is no layer below to merge with');
        return;
      }
      app.commit('Merge Down');
    },

    flatten() {
      app.doc.flatten();
      app.commit('Flatten Image', []);
    },

    freeTransform: () => app.setTool('transform'),
    flipLayerHorizontal: () => flipLayer('x'),
    flipLayerVertical: () => flipLayer('y'),

    cropLayerToSelection() {
      const doc = app.doc;
      const rect = intersectRect(doc.selection, doc.bounds);
      if (!rect) {
        app.toast('Make a selection to crop the layer to');
        return;
      }
      const layer = doc.activeLayer;
      const kept = extractRegion(layer, rect);
      layer.ctx.clearRect(0, 0, doc.width, doc.height);
      layer.ctx.drawImage(kept, rect.x, rect.y);
      app.commit('Crop Layer');
    },
  };
}
