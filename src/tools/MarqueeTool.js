import { Tool } from './Tool.js';
import { clamp } from '../utils/math.js';
import { ellipseSelection, rectSelection } from '../selection/index.js';

export class MarqueeTool extends Tool {
  static meta = { id: 'marquee', label: 'Rectangular Marquee', icon: 'marquee', shortcut: 'm' };

  constructor(app) {
    super(app);
    this.shape = 'rect';
    this.hint = 'Drag to select. Shift constrains to a square, Alt draws from the center. Click to deselect.';
    this.start = null;
  }

  point(pos) {
    const p = { x: Math.round(pos.x), y: Math.round(pos.y) };
    // Ellipses may extend past the canvas edge; clamping them would squash the shape.
    if (this.shape === 'ellipse') return p;
    return { x: clamp(p.x, 0, this.doc.width), y: clamp(p.y, 0, this.doc.height) };
  }

  onPointerDown(e, pos) {
    this.start = this.point(pos);
    this.doc.selection = null;
    this.app.bus.emit('selection:changed');
    this.app.viewport.requestRender(false);
  }

  onPointerMove(e, pos, isDown) {
    if (!this.start || !isDown) return;
    const end = this.point(pos);
    let dx = end.x - this.start.x;
    let dy = end.y - this.start.y;
    if (e.shiftKey) {
      const size = Math.min(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx) * size;
      dy = Math.sign(dy) * size;
    }
    let rect = e.altKey
      ? { x: this.start.x - Math.abs(dx), y: this.start.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 }
      : { x: Math.min(this.start.x, this.start.x + dx), y: Math.min(this.start.y, this.start.y + dy), w: Math.abs(dx), h: Math.abs(dy) };
    if (this.shape === 'rect') rect = this.clampRect(rect);
    this.doc.selection = rect && rect.w >= 1 && rect.h >= 1 ? this.makeSelection(rect) : null;
    this.app.bus.emit('selection:changed');
  }

  clampRect(r) {
    const x = Math.max(0, r.x);
    const y = Math.max(0, r.y);
    return { x, y, w: Math.min(this.doc.width, r.x + r.w) - x, h: Math.min(this.doc.height, r.y + r.h) - y };
  }

  makeSelection(rect) {
    return this.shape === 'ellipse' ? ellipseSelection(rect) : rectSelection(rect);
  }

  onPointerUp() {
    this.start = null;
    this.app.bus.emit('selection:changed');
    this.app.viewport.requestRender(false);
  }
}

export class EllipticalMarqueeTool extends MarqueeTool {
  static meta = { id: 'ellipseMarquee', label: 'Elliptical Marquee', icon: 'ellipseMarquee', shortcut: 'o' };

  constructor(app) {
    super(app);
    this.shape = 'ellipse';
    this.hint = 'Drag to select an ellipse. Shift constrains to a circle, Alt draws from the center. Click to deselect.';
  }
}
