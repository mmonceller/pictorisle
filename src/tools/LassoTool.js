import { Tool } from './Tool.js';
import { lassoSelection } from '../selection/index.js';

const MIN_SEGMENT = 1.5; // screen pixels between recorded points

export class LassoTool extends Tool {
  static meta = { id: 'lasso', label: 'Lasso', icon: 'lasso', shortcut: 'l' };

  constructor(app) {
    super(app);
    this.hint = 'Drag around an area to select it freehand; release to close the outline. Click to deselect.';
    this.wantsCoalesced = true;
    this.points = null;
  }

  onPointerDown(e, pos) {
    this.points = [{ x: pos.x, y: pos.y }];
    this.doc.selection = null;
    this.app.bus.emit('selection:changed');
    this.app.viewport.requestRender(false);
  }

  onPointerMove(e, pos, isDown) {
    if (!this.points || !isDown) return;
    const last = this.points[this.points.length - 1];
    const minDist = MIN_SEGMENT / this.app.viewport.zoom;
    if (Math.hypot(pos.x - last.x, pos.y - last.y) < minDist) return;
    this.points.push({ x: pos.x, y: pos.y });
    this.app.viewport.requestRender(false);
  }

  onPointerUp() {
    const points = this.points;
    this.points = null;
    if (points && points.length >= 3) {
      const sel = lassoSelection(points);
      if (sel.w >= 1 && sel.h >= 1) this.doc.selection = sel;
    }
    this.app.bus.emit('selection:changed');
    this.app.viewport.requestRender(false);
  }

  onKeyDown(e) {
    if (e.key !== 'Escape' || !this.points) return false;
    this.cancel();
    return true;
  }

  cancel() {
    this.points = null;
    this.app.viewport.requestRender(false);
  }

  drawOverlay(ctx, vp) {
    if (!this.points) return;
    ctx.save();
    ctx.beginPath();
    for (const [i, p] of this.points.entries()) {
      const s = vp.docToScreen(p.x, p.y);
      if (i) ctx.lineTo(s.x, s.y);
      else ctx.moveTo(s.x, s.y);
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.restore();
  }
}
