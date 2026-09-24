import { Tool } from './Tool.js';
import { createCanvas, cloneCanvas, replaceCanvasContent } from '../utils/canvas.js';
import { intersectRect } from '../utils/math.js';

const NUDGE_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export class MoveTool extends Tool {
  static meta = { id: 'move', label: 'Move', icon: 'move', shortcut: 'v' };

  constructor(app) {
    super(app);
    this.cursor = 'move';
    this.hint = 'Drag to move the layer (or the selected pixels). Arrow keys nudge, Shift = 10px.';
    this.session = null;
  }

  begin() {
    const layer = this.editableLayer();
    if (!layer) return false;
    const doc = this.doc;
    const sel = doc.selection;
    const session = { layer, dx: 0, dy: 0, selection: sel ? { ...sel } : null };
    if (sel) {
      session.floating = createCanvas(sel.w, sel.h);
      session.floating.getContext('2d').drawImage(layer.canvas, -sel.x, -sel.y);
      session.base = cloneCanvas(layer.canvas);
      session.base.getContext('2d').clearRect(sel.x, sel.y, sel.w, sel.h);
      session.preview = createCanvas(doc.width, doc.height);
    }
    this.session = session;
    return true;
  }

  update(dx, dy) {
    const s = this.session;
    s.dx = dx;
    s.dy = dy;
    if (s.selection) {
      const ctx = s.preview.getContext('2d');
      ctx.clearRect(0, 0, s.preview.width, s.preview.height);
      ctx.drawImage(s.base, 0, 0);
      ctx.drawImage(s.floating, s.selection.x + dx, s.selection.y + dy);
      this.doc.selection = { ...s.selection, x: s.selection.x + dx, y: s.selection.y + dy };
      this.app.setPreview(s.layer, s.preview);
    } else {
      s.layer.offsetX = dx;
      s.layer.offsetY = dy;
      this.app.requestRender();
    }
  }

  end() {
    const s = this.session;
    if (!s) return;
    this.session = null;
    if (!s.dx && !s.dy) {
      this.restore(s);
      return;
    }
    if (s.selection) {
      replaceCanvasContent(s.layer.canvas, s.preview);
      this.doc.selection = intersectRect(this.doc.selection, this.doc.bounds);
    } else {
      const copy = cloneCanvas(s.layer.canvas);
      s.layer.offsetX = 0;
      s.layer.offsetY = 0;
      s.layer.ctx.clearRect(0, 0, copy.width, copy.height);
      s.layer.ctx.drawImage(copy, s.dx, s.dy);
    }
    this.app.setPreview(null);
    this.app.commit('Move');
  }

  restore(session) {
    session.layer.offsetX = 0;
    session.layer.offsetY = 0;
    if (session.selection) this.doc.selection = session.selection;
    this.app.setPreview(null);
  }

  onPointerDown(e, pos) {
    if (this.begin()) this.start = pos;
  }

  onPointerMove(e, pos, isDown) {
    if (!this.session || !isDown) return;
    let dx = Math.round(pos.x - this.start.x);
    let dy = Math.round(pos.y - this.start.y);
    if (e.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    this.update(dx, dy);
  }

  onPointerUp() {
    this.end();
  }

  onKeyDown(e) {
    const dir = NUDGE_KEYS[e.key];
    if (!dir || this.session) return false;
    const step = e.shiftKey ? 10 : 1;
    if (this.begin()) {
      this.update(dir[0] * step, dir[1] * step);
      this.end();
    }
    return true;
  }

  cancel() {
    if (!this.session) return;
    this.restore(this.session);
    this.session = null;
  }
}
