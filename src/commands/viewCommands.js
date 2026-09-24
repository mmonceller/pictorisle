export function viewCommands(app) {
  const vp = app.viewport;
  return {
    zoomIn: () => vp.zoomStep(1),
    zoomOut: () => vp.zoomStep(-1),
    fitToScreen: () => vp.fit(),
    actualSize: () => vp.actualSize(),
  };
}
