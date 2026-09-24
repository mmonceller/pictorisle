export function selectCommands(app) {
  const setSelection = (selection) => {
    app.doc.selection = selection;
    app.bus.emit('selection:changed');
    app.viewport.requestRender(false);
  };

  return {
    selectAll: () => setSelection(app.doc.bounds),
    deselect: () => setSelection(null),
  };
}
