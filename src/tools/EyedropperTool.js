import { Tool } from './Tool.js';
import { rgbToHex } from '../utils/color.js';

export class EyedropperTool extends Tool {
  static meta = { id: 'eyedropper', label: 'Eyedropper', icon: 'eyedropper', shortcut: 'i' };

  constructor(app) {
    super(app);
    this.options = { sample: 'all' };
    this.hint = 'Click to pick the foreground color. Alt-click picks the background color.';
    this.source = null;
  }

  get schema() {
    return [
      { key: 'sample', label: 'Sample', type: 'select', options: [['all', 'All Layers'], ['layer', 'Current Layer']] },
    ];
  }

  onPointerDown(e, pos) {
    this.source = this.options.sample === 'all' ? this.doc.composite() : this.doc.activeLayer.canvas;
    this.pick(e, pos);
  }

  onPointerMove(e, pos, isDown) {
    if (isDown && this.source) this.pick(e, pos);
  }

  onPointerUp() {
    this.source = null;
  }

  pick(e, pos) {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (x < 0 || y < 0 || x >= this.source.width || y >= this.source.height) return;
    const [r, g, b, a] = this.source.getContext('2d').getImageData(x, y, 1, 1).data;
    if (a === 0) return;
    this.app.setColor(e.altKey ? 'secondary' : 'primary', rgbToHex(r, g, b));
  }
}
