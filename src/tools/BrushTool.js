import { Tool } from './Tool.js';
import { createCanvas, clipToSelection, replaceCanvasContent } from '../utils/canvas.js';
import { createBrushTip } from '../utils/brush.js';

export class BrushTool extends Tool {
  static meta = { id: 'brush', label: 'Brush', icon: 'brush', shortcut: 'b' };

  constructor(app) {
    super(app);
    this.options = { size: 20, hardness: 80, opacity: 100 };
    this.compositeOperation = 'source-over';
    this.cursor = 'none';
    this.wantsCoalesced = true;
    this.hint = 'Drag to paint. Shift-click to draw a straight line. [ and ] change size.';
    this.stroke = null;
    this.lastStrokeEnd = null;
  }

  get schema() {
    return [
      { key: 'size', label: 'Size', type: 'range', min: 1, max: 500, unit: 'px' },
      { key: 'hardness', label: 'Hardness', type: 'range', min: 0, max: 100, unit: '%' },
      { key: 'opacity', label: 'Opacity', type: 'range', min: 1, max: 100, unit: '%' },
    ];
  }

  get color() {
    return this.app.colors.primary;
  }

  get historyLabel() {
    return 'Brush Stroke';
  }

  onPointerDown(e, pos) {
    const layer = this.editableLayer();
    if (!layer) return;
    const { width, height } = this.doc;
    this.layer = layer;
    this.stroke = createCanvas(width, height);
    this.strokeCtx = this.stroke.getContext('2d');
    this.preview = createCanvas(width, height);
    this.tip = createBrushTip(this.options.size, this.options.hardness / 100, this.color);
    this.carry = 0;

    if (e.shiftKey && this.lastStrokeEnd) {
      this.stamp(this.lastStrokeEnd.x, this.lastStrokeEnd.y);
      this.stampLine(this.lastStrokeEnd, pos);
    } else {
      this.stamp(pos.x, pos.y);
    }
    this.lastPoint = pos;
    this.updatePreview();
  }

  onPointerMove(e, pos, isDown) {
    if (!this.stroke || !isDown) return;
    this.stampLine(this.lastPoint, pos);
    this.lastPoint = pos;
    this.updatePreview();
  }

  onPointerUp() {
    if (!this.stroke) return;
    replaceCanvasContent(this.layer.canvas, this.preview);
    this.lastStrokeEnd = this.lastPoint;
    this.stroke = null;
    this.app.setPreview(null);
    this.app.commit(this.historyLabel);
  }

  cancel() {
    if (!this.stroke) return;
    this.stroke = null;
    this.app.setPreview(null);
  }

  stamp(x, y) {
    const { tip } = this;
    this.strokeCtx.drawImage(tip, x - tip.width / 2, y - tip.height / 2);
  }

  /** Places stamps at even spacing, carrying leftover distance between segments. */
  stampLine(from, to) {
    const spacing = Math.max(1, this.options.size * 0.12);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    let d = spacing - this.carry;
    while (d <= dist) {
      const t = d / dist;
      this.stamp(from.x + dx * t, from.y + dy * t);
      d += spacing;
    }
    this.carry = dist - (d - spacing);
  }

  updatePreview() {
    const ctx = this.preview.getContext('2d');
    ctx.clearRect(0, 0, this.preview.width, this.preview.height);
    ctx.drawImage(this.layer.canvas, 0, 0);
    ctx.save();
    clipToSelection(ctx, this.doc.selection);
    ctx.globalAlpha = this.options.opacity / 100;
    ctx.globalCompositeOperation = this.compositeOperation;
    ctx.drawImage(this.stroke, 0, 0);
    ctx.restore();
    this.app.setPreview(this.layer, this.preview);
  }

  drawOverlay(ctx, viewport) {
    const p = this.app.pointer;
    if (!p) return;
    const radius = Math.max(1, (this.options.size * viewport.zoom) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (radius < 6) {
      ctx.beginPath();
      ctx.moveTo(p.sx - 6, p.sy);
      ctx.lineTo(p.sx + 6, p.sy);
      ctx.moveTo(p.sx, p.sy - 6);
      ctx.lineTo(p.sx, p.sy + 6);
      ctx.stroke();
    }
    ctx.restore();
  }
}
