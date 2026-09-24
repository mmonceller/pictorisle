import { Tool } from './Tool.js';

export class ZoomTool extends Tool {
  static meta = { id: 'zoom', label: 'Zoom', icon: 'zoom', shortcut: 'z' };

  constructor(app) {
    super(app);
    this.cursor = 'zoom-in';
    this.hint = 'Click to zoom in, Alt-click to zoom out.';
  }

  onPointerDown(e, pos) {
    this.app.viewport.zoomStep(e.altKey ? -1 : 1, pos.sx, pos.sy);
  }
}
