import { Tool } from './Tool.js';
import { createCanvas, clipToSelection, replaceCanvasContent } from '../utils/canvas.js';
import { hexToRgb } from '../utils/color.js';
import { snapAngle } from '../utils/math.js';

export class GradientTool extends Tool {
  static meta = { id: 'gradient', label: 'Gradient', icon: 'gradient', shortcut: 'g' };

  constructor(app) {
    super(app);
    this.options = { type: 'linear', colors: 'fg-bg', opacity: 100 };
    this.hint = 'Drag to draw a gradient. Shift snaps to 45°.';
    this.drag = null;
  }

  get schema() {
    return [
      { key: 'type', label: 'Type', type: 'select', options: [['linear', 'Linear'], ['radial', 'Radial']] },
      {
        key: 'colors',
        label: 'Colors',
        type: 'select',
        options: [
          ['fg-bg', 'Foreground → Background'],
          ['fg-transparent', 'Foreground → Transparent'],
        ],
      },
      { key: 'opacity', label: 'Opacity', type: 'range', min: 1, max: 100, unit: '%' },
    ];
  }

  onPointerDown(e, pos) {
    const layer = this.editableLayer();
    if (!layer) return;
    this.drag = { layer, start: pos, end: pos, preview: createCanvas(this.doc.width, this.doc.height) };
  }

  onPointerMove(e, pos, isDown) {
    if (!this.drag || !isDown) return;
    this.drag.end = e.shiftKey ? snapAngle(this.drag.start, pos) : pos;
    this.renderPreview();
  }

  onPointerUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (Math.hypot(d.end.x - d.start.x, d.end.y - d.start.y) < 1) {
      this.app.setPreview(null);
      return;
    }
    replaceCanvasContent(d.layer.canvas, d.preview);
    this.app.setPreview(null);
    this.app.commit('Gradient');
  }

  cancel() {
    if (!this.drag) return;
    this.drag = null;
    this.app.setPreview(null);
  }

  createGradient(ctx, start, end) {
    const { primary, secondary } = this.app.colors;
    const gradient =
      this.options.type === 'radial'
        ? ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, Math.hypot(end.x - start.x, end.y - start.y))
        : ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, primary);
    if (this.options.colors === 'fg-transparent') {
      const { r, g, b } = hexToRgb(primary);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    } else {
      gradient.addColorStop(1, secondary);
    }
    return gradient;
  }

  renderPreview() {
    const { layer, start, end, preview } = this.drag;
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.save();
    clipToSelection(ctx, this.doc.selection);
    ctx.globalAlpha = this.options.opacity / 100;
    ctx.fillStyle = this.createGradient(ctx, start, end);
    ctx.fillRect(0, 0, preview.width, preview.height);
    ctx.restore();
    this.app.setPreview(layer, preview);
  }

  drawOverlay(ctx, viewport) {
    if (!this.drag) return;
    const a = viewport.docToScreen(this.drag.start.x, this.drag.start.y);
    const b = viewport.docToScreen(this.drag.end.x, this.drag.end.y);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
    ctx.restore();
  }
}
