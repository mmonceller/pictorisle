import { Tool } from './Tool.js';
import { floodFill } from '../utils/floodFill.js';
import { hexToRgb } from '../utils/color.js';
import { createCanvas } from '../utils/canvas.js';
import { isRectSelection, replaceWithinSelection } from '../selection/index.js';

export class FillTool extends Tool {
  static meta = { id: 'fill', label: 'Paint Bucket', icon: 'bucket', shortcut: 'k' };

  constructor(app) {
    super(app);
    this.options = { tolerance: 32, opacity: 100, contiguous: true };
    this.hint = 'Click to fill similar colors with the foreground color.';
  }

  get schema() {
    return [
      { key: 'tolerance', label: 'Tolerance', type: 'range', min: 0, max: 255 },
      { key: 'opacity', label: 'Opacity', type: 'range', min: 1, max: 100, unit: '%' },
      { key: 'contiguous', label: 'Contiguous', type: 'checkbox' },
    ];
  }

  onPointerDown(e, pos) {
    const layer = this.editableLayer();
    if (!layer) return;
    const { width, height, selection } = this.doc;
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const imageData = layer.ctx.getImageData(0, 0, width, height);
    const color = { ...hexToRgb(this.app.colors.primary), a: this.options.opacity / 100 };
    const filled = floodFill(imageData, x, y, color, {
      tolerance: this.options.tolerance,
      contiguous: this.options.contiguous,
      bounds: selection,
    });
    if (!filled) return;
    if (selection && !isRectSelection(selection)) {
      const result = createCanvas(width, height);
      result.getContext('2d').putImageData(imageData, 0, 0);
      replaceWithinSelection(layer.ctx, result, selection);
    } else {
      layer.ctx.putImageData(imageData, 0, 0);
    }
    this.app.commit('Paint Bucket');
  }
}
