import { clamp } from '../utils/math.js';

export function toolCommands(app) {
  const adjustSize = (direction) => {
    const tool = app.activeTool;
    if (typeof tool.options.size !== 'number') return;
    const size = tool.options.size;
    const step = size < 10 ? 1 : size < 50 ? 5 : size < 100 ? 10 : 25;
    tool.options.size = clamp(size + direction * step, 1, 500);
    tool.onOptionsChange('size');
    app.bus.emit('tool:options', tool);
    app.viewport.requestRender(false);
  };

  return {
    swapColors: () => app.swapColors(),
    resetColors: () => app.resetColors(),
    brushSmaller: () => adjustSize(-1),
    brushLarger: () => adjustSize(1),
  };
}
