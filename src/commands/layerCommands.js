export function layerCommands(app) {
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
  };
}
