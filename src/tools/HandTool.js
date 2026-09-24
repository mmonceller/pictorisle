import { Tool } from './Tool.js';

export class HandTool extends Tool {
  static meta = { id: 'hand', label: 'Hand', icon: 'hand', shortcut: 'h' };

  constructor(app) {
    super(app);
    this.cursor = 'grab';
    this.hint = 'Drag to pan the view. Hold Space with any tool to pan temporarily.';
    this.last = null;
  }

  onPointerDown(e) {
    this.last = { x: e.clientX, y: e.clientY };
  }

  onPointerMove(e, pos, isDown) {
    if (!isDown || !this.last) return;
    this.app.viewport.panBy(e.clientX - this.last.x, e.clientY - this.last.y);
    this.last = { x: e.clientX, y: e.clientY };
  }

  onPointerUp() {
    this.last = null;
  }
}
