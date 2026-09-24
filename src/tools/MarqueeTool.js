import { Tool } from './Tool.js';
import { clamp, normalizeRect } from '../utils/math.js';

export class MarqueeTool extends Tool {
  static meta = { id: 'marquee', label: 'Rectangular Marquee', icon: 'marquee', shortcut: 'm' };

  constructor(app) {
    super(app);
    this.hint = 'Drag to select. Shift constrains to a square. Click to deselect.';
    this.start = null;
  }

  clampPoint(pos) {
    return {
      x: clamp(Math.round(pos.x), 0, this.doc.width),
      y: clamp(Math.round(pos.y), 0, this.doc.height),
    };
  }

  onPointerDown(e, pos) {
    this.start = this.clampPoint(pos);
    this.doc.selection = null;
    this.app.viewport.requestRender(false);
  }

  onPointerMove(e, pos, isDown) {
    if (!this.start || !isDown) return;
    let { x, y } = this.clampPoint(pos);
    if (e.shiftKey) {
      const size = Math.min(Math.abs(x - this.start.x), Math.abs(y - this.start.y));
      x = this.start.x + Math.sign(x - this.start.x) * size;
      y = this.start.y + Math.sign(y - this.start.y) * size;
    }
    const rect = normalizeRect(this.start.x, this.start.y, x, y);
    this.doc.selection = rect.w >= 1 && rect.h >= 1 ? rect : null;
    this.app.bus.emit('selection:changed');
  }

  onPointerUp() {
    this.start = null;
    this.app.bus.emit('selection:changed');
    this.app.viewport.requestRender(false);
  }
}
