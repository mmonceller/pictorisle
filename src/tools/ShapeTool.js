import { Tool } from './Tool.js';
import { createCanvas, clipToSelection, replaceCanvasContent } from '../utils/canvas.js';
import { normalizeRect, snapAngle } from '../utils/math.js';

const LABELS = { rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line' };

export class ShapeTool extends Tool {
  static meta = { id: 'shape', label: 'Shape', icon: 'shape', shortcut: 'u' };

  constructor(app) {
    super(app);
    this.options = { shape: 'rectangle', style: 'fill', strokeWidth: 4, opacity: 100 };
    this.hint = 'Drag to draw. Shift constrains proportions, Alt draws from the center.';
    this.drag = null;
  }

  get schema() {
    return [
      {
        key: 'shape',
        label: 'Shape',
        type: 'select',
        options: [['rectangle', 'Rectangle'], ['ellipse', 'Ellipse'], ['line', 'Line']],
      },
      { key: 'style', label: 'Style', type: 'select', options: [['fill', 'Fill'], ['stroke', 'Stroke']] },
      { key: 'strokeWidth', label: 'Stroke', type: 'range', min: 1, max: 100, unit: 'px' },
      { key: 'opacity', label: 'Opacity', type: 'range', min: 1, max: 100, unit: '%' },
    ];
  }

  onPointerDown(e, pos) {
    const layer = this.editableLayer();
    if (!layer) return;
    this.drag = {
      layer,
      start: pos,
      end: pos,
      shift: false,
      alt: false,
      preview: createCanvas(this.doc.width, this.doc.height),
    };
  }

  onPointerMove(e, pos, isDown) {
    if (!this.drag || !isDown) return;
    Object.assign(this.drag, { end: pos, shift: e.shiftKey, alt: e.altKey });
    this.renderPreview();
  }

  onPointerUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const g = this.geometry(d);
    const tooSmall = this.options.shape === 'line' ? Math.hypot(g.x1 - g.x0, g.y1 - g.y0) < 1 : g.w < 1 || g.h < 1;
    if (tooSmall) {
      this.app.setPreview(null);
      return;
    }
    replaceCanvasContent(d.layer.canvas, d.preview);
    this.app.setPreview(null);
    this.app.commit(LABELS[this.options.shape]);
  }

  cancel() {
    if (!this.drag) return;
    this.drag = null;
    this.app.setPreview(null);
  }

  geometry({ start, end, shift, alt }) {
    if (this.options.shape === 'line') {
      const to = shift ? snapAngle(start, end) : end;
      return { x0: start.x, y0: start.y, x1: to.x, y1: to.y };
    }
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    if (shift) {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      dx = Math.sign(dx || 1) * size;
      dy = Math.sign(dy || 1) * size;
    }
    if (alt) {
      return { x: start.x - Math.abs(dx), y: start.y - Math.abs(dy), w: Math.abs(dx) * 2, h: Math.abs(dy) * 2 };
    }
    return normalizeRect(start.x, start.y, start.x + dx, start.y + dy);
  }

  drawShape(ctx, g) {
    const { shape, style, strokeWidth } = this.options;
    ctx.fillStyle = ctx.strokeStyle = this.app.colors.primary;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (shape === 'line') {
      ctx.moveTo(g.x0, g.y0);
      ctx.lineTo(g.x1, g.y1);
      ctx.stroke();
      return;
    }
    if (shape === 'rectangle') ctx.rect(g.x, g.y, g.w, g.h);
    else ctx.ellipse(g.x + g.w / 2, g.y + g.h / 2, g.w / 2, g.h / 2, 0, 0, Math.PI * 2);
    if (style === 'fill') ctx.fill();
    else ctx.stroke();
  }

  renderPreview() {
    const d = this.drag;
    const ctx = d.preview.getContext('2d');
    ctx.clearRect(0, 0, d.preview.width, d.preview.height);
    ctx.drawImage(d.layer.canvas, 0, 0);
    ctx.save();
    clipToSelection(ctx, this.doc.selection);
    ctx.globalAlpha = this.options.opacity / 100;
    this.drawShape(ctx, this.geometry(d));
    ctx.restore();
    this.app.setPreview(d.layer, d.preview);
  }
}
