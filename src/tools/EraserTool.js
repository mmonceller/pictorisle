import { BrushTool } from './BrushTool.js';

export class EraserTool extends BrushTool {
  static meta = { id: 'eraser', label: 'Eraser', icon: 'eraser', shortcut: 'e' };

  constructor(app) {
    super(app);
    this.options = { size: 40, hardness: 90, opacity: 100 };
    this.compositeOperation = 'destination-out';
    this.hint = 'Drag to erase to transparency. Shift-click to erase a straight line.';
  }

  get color() {
    return '#000000';
  }

  get historyLabel() {
    return 'Eraser';
  }
}
