import { Tool } from './Tool.js';
import { createCanvas, cloneCanvas } from '../utils/canvas.js';
import { contentBounds } from '../utils/bounds.js';
import {
  clampSelection,
  isRectSelection,
  lassoSelection,
  liftSelection,
  rectSelection,
  selectionPolygon,
} from '../selection/index.js';

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 28;
const ROTATE_ZONE = 24;
const ROTATE = { id: 'rotate' };
const HANDLES = [
  { id: 'nw', left: true, top: true, angle: 225 },
  { id: 'n', top: true, angle: 270 },
  { id: 'ne', right: true, top: true, angle: 315 },
  { id: 'e', right: true, angle: 0 },
  { id: 'se', right: true, bottom: true, angle: 45 },
  { id: 's', bottom: true, angle: 90 },
  { id: 'sw', left: true, bottom: true, angle: 135 },
  { id: 'w', left: true, angle: 180 },
];
const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
const NUDGE_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const DEG = Math.PI / 180;

const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const normalizeAngle = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const roundDegrees = (rad) => Math.round((rad / DEG) * 10) / 10;

function rotatePoint(p, pivot, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

/**
 * Resize, crop, rotate, flip and move the active layer's content (or the selected part of it).
 *
 * A session keeps its geometry in a local (unrotated) frame, rendered rotated by `angle` around `pivot`:
 *   full – where the whole extracted source image is drawn (scaled/flipped)
 *   crop – the visible part of it; always inside `full`
 */
export class TransformTool extends Tool {
  static meta = { id: 'transform', label: 'Transform', icon: 'transform', shortcut: 'q' };

  constructor(app) {
    super(app);
    this.options = { mode: 'scale', keepAspect: true, rotateSnap: 'free', angle: 0 };
    this.cursor = 'default';
    this.hint =
      'Drag handles to resize or crop, drag the round handle (or just outside the box) to rotate, Shift snaps. Enter applies, Esc cancels.';
    this.session = null;
    this.drag = null;
    this.busy = false;
    app.bus.on('document:changed', () => this.sync());
  }

  get schema() {
    return [
      { key: 'mode', label: 'Mode', type: 'select', options: [['scale', 'Resize'], ['crop', 'Crop']] },
      { key: 'keepAspect', label: 'Keep Proportions', type: 'checkbox' },
      {
        key: 'rotateSnap',
        label: 'Rotation',
        type: 'select',
        options: [['free', 'Free Hand'], ['15', 'Snap 15°'], ['45', 'Snap 45°'], ['90', 'Snap 90°']],
      },
      { key: 'angle', label: 'Angle', type: 'number', min: -180, max: 180, step: 0.1, unit: '°' },
      { type: 'button', label: '⟲ 90°', title: 'Rotate 90° counter-clockwise', action: () => this.rotateBy(-90) },
      { type: 'button', label: '⟳ 90°', title: 'Rotate 90° clockwise', action: () => this.rotateBy(90) },
      { type: 'button', label: 'Flip H', title: 'Flip horizontal', action: () => this.flip('x') },
      { type: 'button', label: 'Flip V', title: 'Flip vertical', action: () => this.flip('y') },
      { type: 'button', label: 'Reset', action: () => this.reset() },
      { type: 'button', label: 'Cancel', action: () => this.revert() },
      { type: 'button', label: 'Apply', primary: true, action: () => this.apply() },
    ];
  }

  // ---- Session lifecycle --------------------------------------------------------------

  /** Image layers can always be transformed; any other layer only its selected pixels. */
  isAvailable() {
    return !!this.session || this.doc?.activeLayer?.kind === 'image' || !!this.doc?.selection;
  }

  activate() {
    this.begin();
  }

  deactivate() {
    this.apply(false);
  }

  cancel() {
    this.discard();
  }

  commitPending() {
    this.apply();
  }

  revertPending() {
    if (!this.session?.modified) return false;
    this.revert();
    return true;
  }

  begin() {
    this.session = null;
    this.syncAngleOption(0);
    const doc = this.doc;
    const layer = doc.activeLayer;
    if (!layer.visible || !this.isAvailable()) return;
    const sel = doc.selection;
    const pixels = sel ? liftSelection(layer.canvas, sel) : layer.canvas;
    const bounds = contentBounds(pixels);
    if (!bounds) {
      this.app.viewport.requestRender(false);
      return;
    }

    const base = cloneCanvas(layer.canvas);
    if (sel) layer.erase(sel, base.getContext('2d'));
    else base.getContext('2d').clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
    const source = createCanvas(bounds.w, bounds.h);
    source.getContext('2d').drawImage(pixels, -bounds.x, -bounds.y);
    this.session = {
      layer,
      version: layer.version,
      docSize: `${doc.width}x${doc.height}`,
      source,
      base,
      preview: createCanvas(doc.width, doc.height),
      bounds,
      crop: { ...bounds },
      full: { ...bounds },
      pivot: center(bounds),
      angle: 0,
      flipX: false,
      flipY: false,
      modified: false,
      savedSelection: doc.selection,
    };
    doc.selection = null;
    this.app.viewport.requestRender(false);
  }

  /** Keeps the session in step with the document (layer switches, undo, external edits). */
  sync() {
    if (this.app.activeTool !== this || this.busy) return;
    const doc = this.doc;
    const s = this.session;
    const layerAlive = s && doc.layers.includes(s.layer);
    const unchanged = layerAlive && s.layer.version === s.version && s.docSize === `${doc.width}x${doc.height}`;
    if (s && unchanged && s.layer === doc.activeLayer) return;
    if (s && unchanged && s.modified) {
      this.apply();
      return;
    }
    this.discard();
    this.begin();
  }

  discard() {
    const s = this.session;
    if (!s) return;
    this.session = null;
    this.drag = null;
    if (!s.modified && s.savedSelection && !this.doc.selection) this.doc.selection = s.savedSelection;
    if (this.app.preview?.layer === s.layer) this.app.setPreview(null);
    this.app.viewport.requestRender(false);
  }

  revert() {
    const s = this.session;
    if (!s) return;
    if (s.savedSelection) this.doc.selection = s.savedSelection;
    s.modified = false;
    this.discard();
    this.begin();
  }

  apply(restart = true) {
    const s = this.session;
    if (!s) return;
    if (!s.modified) {
      this.discard();
      if (restart && this.app.activeTool === this) this.begin();
      return;
    }
    this.busy = true;
    const ctx = s.layer.ctx;
    ctx.clearRect(0, 0, s.layer.canvas.width, s.layer.canvas.height);
    ctx.drawImage(s.base, 0, 0);
    this.drawClipped(ctx, s);
    // Keep the transformed pixels selected so they can be transformed again or moved.
    if (s.savedSelection) this.doc.selection = clampSelection(this.transformedSelection(), this.doc.bounds);
    this.session = null;
    this.drag = null;
    this.app.setPreview(null);
    this.app.commit('Free Transform', [s.layer]);
    this.busy = false;
    if (restart && this.app.activeTool === this) this.begin();
  }

  // ---- Coordinate frames --------------------------------------------------------------

  toWorld(p) {
    return rotatePoint(p, this.session.pivot, this.session.angle);
  }

  toLocal(p) {
    return rotatePoint(p, this.session.pivot, -this.session.angle);
  }

  /** The original selection outline carried through the current scale/flip/rotation. */
  transformedSelection() {
    const s = this.session;
    const { bounds: b, full } = s;
    const sx = full.w / b.w;
    const sy = full.h / b.h;
    const points = selectionPolygon(s.savedSelection).map((p) => {
      const u = (p.x - b.x) * sx;
      const v = (p.y - b.y) * sy;
      return this.toWorld({ x: s.flipX ? full.x + full.w - u : full.x + u, y: s.flipY ? full.y + full.h - v : full.y + v });
    });
    const shape = lassoSelection(points);
    return isRectSelection(s.savedSelection) && s.angle === 0 ? rectSelection(shape) : shape;
  }

  /** Moves the pivot to the crop center without changing what's rendered. */
  repivotToCenter() {
    const s = this.session;
    const c = center(s.crop);
    const pivot = this.toWorld(c);
    const dx = pivot.x - c.x;
    const dy = pivot.y - c.y;
    s.crop.x += dx;
    s.crop.y += dy;
    s.full.x += dx;
    s.full.y += dy;
    s.pivot = pivot;
  }

  // ---- Operations ---------------------------------------------------------------------

  setAngle(radians) {
    const s = this.session;
    if (!s) return;
    this.repivotToCenter();
    s.angle = normalizeAngle(radians);
    this.changed();
  }

  rotateBy(degrees) {
    if (!this.session) return;
    this.setAngle(this.session.angle + degrees * DEG);
    this.syncAngleOption(roundDegrees(this.session.angle));
  }

  syncAngleOption(degrees) {
    if (this.options.angle === degrees) return;
    this.options.angle = degrees;
    if (this.app.activeTool === this) this.app.bus.emit('tool:options', this);
  }

  flip(axis) {
    const s = this.session;
    if (!s) return;
    const { crop, full } = s;
    if (axis === 'x') {
      full.x = 2 * crop.x + crop.w - full.x - full.w;
      s.flipX = !s.flipX;
    } else {
      full.y = 2 * crop.y + crop.h - full.y - full.h;
      s.flipY = !s.flipY;
    }
    this.changed();
  }

  reset() {
    const s = this.session;
    if (!s) return;
    s.crop = { ...s.bounds };
    s.full = { ...s.bounds };
    s.pivot = center(s.bounds);
    s.angle = 0;
    s.flipX = s.flipY = false;
    this.syncAngleOption(0);
    this.changed();
  }

  moveBy(dx, dy) {
    const s = this.session;
    for (const r of [s.crop, s.full, s.pivot]) {
      r.x += dx;
      r.y += dy;
    }
    this.changed();
  }

  changed() {
    this.session.modified = true;
    this.renderPreview();
  }

  onOptionsChange(key) {
    if (key === 'angle') this.setAngle(this.options.angle * DEG);
    else if (this.session?.modified) this.renderPreview();
  }

  snapStep(e) {
    if (this.options.rotateSnap !== 'free') return Number(this.options.rotateSnap) * DEG;
    return e.shiftKey ? 15 * DEG : 0;
  }

  // ---- Hit testing & cursors ----------------------------------------------------------

  handlePoint(handle, r) {
    return {
      x: handle.left ? r.x : handle.right ? r.x + r.w : r.x + r.w / 2,
      y: handle.top ? r.y : handle.bottom ? r.y + r.h : r.y + r.h / 2,
    };
  }

  rotateHandlePoint() {
    const { crop } = this.session;
    return { x: crop.x + crop.w / 2, y: crop.y - ROTATE_HANDLE_OFFSET / this.app.viewport.zoom };
  }

  hitTest(pos) {
    const s = this.session;
    if (!s) return null;
    const zoom = this.app.viewport.zoom;
    const reach = HANDLE_SIZE / zoom;
    const p = this.toLocal(pos);
    const c = s.crop;

    const rh = this.rotateHandlePoint();
    if (Math.hypot(p.x - rh.x, p.y - rh.y) <= reach * 1.2) return ROTATE;
    for (const handle of HANDLES) {
      const hp = this.handlePoint(handle, c);
      if (Math.abs(p.x - hp.x) <= reach && Math.abs(p.y - hp.y) <= reach) return handle;
    }
    if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return 'move';
    const zone = ROTATE_ZONE / zoom;
    if (p.x >= c.x - zone && p.x <= c.x + c.w + zone && p.y >= c.y - zone && p.y <= c.y + c.h + zone) return ROTATE;
    return null;
  }

  cursorFor(hit) {
    if (!hit) return 'default';
    if (hit === 'move') return 'move';
    if (hit === ROTATE) return 'grab';
    const degrees = hit.angle + this.session.angle / DEG;
    return RESIZE_CURSORS[((Math.round(degrees / 45) % 4) + 4) % 4];
  }

  setCursor(cursor) {
    if (cursor === this.cursor) return;
    this.cursor = cursor;
    this.app.input.updateCursor();
  }

  // ---- Pointer & keyboard -------------------------------------------------------------

  onPointerDown(e, pos) {
    if (!this.session) this.begin();
    const hit = this.hitTest(pos);
    if (!hit) return;
    const s = this.session;
    if (hit === ROTATE) {
      this.repivotToCenter();
      this.drag = { hit, startAngle: Math.atan2(pos.y - s.pivot.y, pos.x - s.pivot.x), angle0: s.angle };
      this.setCursor('grabbing');
      return;
    }
    this.drag = {
      hit,
      start: pos,
      localStart: this.toLocal(pos),
      crop: { ...s.crop },
      full: { ...s.full },
      pivot: { ...s.pivot },
    };
  }

  onPointerMove(e, pos, isDown) {
    if (!isDown || !this.drag) {
      this.setCursor(this.cursorFor(this.hitTest(pos)));
      return;
    }
    const s = this.session;
    const { hit } = this.drag;

    if (hit === ROTATE) {
      let angle = this.drag.angle0 + Math.atan2(pos.y - s.pivot.y, pos.x - s.pivot.x) - this.drag.startAngle;
      const step = this.snapStep(e);
      if (step) angle = Math.round(angle / step) * step;
      s.angle = normalizeAngle(angle);
      this.changed();
      return;
    }

    if (hit === 'move') {
      const dx = Math.round(pos.x - this.drag.start.x);
      const dy = Math.round(pos.y - this.drag.start.y);
      const shift = (r) => ({ ...r, x: r.x + dx, y: r.y + dy });
      s.crop = shift(this.drag.crop);
      s.full = shift(this.drag.full);
      s.pivot = shift(this.drag.pivot);
      this.changed();
      return;
    }

    const local = this.toLocal(pos);
    const dx = local.x - this.drag.localStart.x;
    const dy = local.y - this.drag.localStart.y;
    if (this.options.mode === 'crop') this.dragCrop(hit, dx, dy);
    else this.dragScale(hit, dx, dy, this.options.keepAspect !== e.shiftKey);
    this.changed();
  }

  onPointerUp(e, pos) {
    if (this.drag?.hit === ROTATE) this.syncAngleOption(roundDegrees(this.session.angle));
    this.drag = null;
    if (this.session) this.setCursor(this.cursorFor(this.hitTest(pos)));
  }

  dragScale(handle, dx, dy, keepAspect) {
    const c0 = this.drag.crop;
    const f0 = this.drag.full;
    let left = c0.x + (handle.left ? dx : 0);
    let right = c0.x + c0.w + (handle.right ? dx : 0);
    let top = c0.y + (handle.top ? dy : 0);
    let bottom = c0.y + c0.h + (handle.bottom ? dy : 0);
    if (handle.left) left = Math.min(left, right - 1);
    if (handle.right) right = Math.max(right, left + 1);
    if (handle.top) top = Math.min(top, bottom - 1);
    if (handle.bottom) bottom = Math.max(bottom, top + 1);

    const isCorner = (handle.left || handle.right) && (handle.top || handle.bottom);
    if (keepAspect && isCorner) {
      const scale = Math.max((right - left) / c0.w, (bottom - top) / c0.h);
      const w = c0.w * scale;
      const h = c0.h * scale;
      if (handle.left) left = right - w;
      else right = left + w;
      if (handle.top) top = bottom - h;
      else bottom = top + h;
    }

    const crop = { x: left, y: top, w: right - left, h: bottom - top };
    const sx = crop.w / c0.w;
    const sy = crop.h / c0.h;
    this.session.crop = crop;
    this.session.full = {
      x: crop.x + (f0.x - c0.x) * sx,
      y: crop.y + (f0.y - c0.y) * sy,
      w: f0.w * sx,
      h: f0.h * sy,
    };
  }

  dragCrop(handle, dx, dy) {
    const c0 = this.drag.crop;
    const f = this.session.full;
    let left = c0.x;
    let right = c0.x + c0.w;
    let top = c0.y;
    let bottom = c0.y + c0.h;
    if (handle.left) left = Math.min(Math.max(c0.x + dx, f.x), right - 1);
    if (handle.right) right = Math.max(Math.min(right + dx, f.x + f.w), left + 1);
    if (handle.top) top = Math.min(Math.max(c0.y + dy, f.y), bottom - 1);
    if (handle.bottom) bottom = Math.max(Math.min(bottom + dy, f.y + f.h), top + 1);
    this.session.crop = { x: left, y: top, w: right - left, h: bottom - top };
  }

  onKeyDown(e) {
    if (!this.session) return false;
    if (e.key === 'Enter') {
      this.apply();
      return true;
    }
    if (e.key === 'Escape') {
      this.revert();
      return true;
    }
    const dir = NUDGE_KEYS[e.key];
    if (dir) {
      const step = e.shiftKey ? 10 : 1;
      this.moveBy(dir[0] * step, dir[1] * step);
      return true;
    }
    return false;
  }

  // ---- Rendering ----------------------------------------------------------------------

  applyRotation(ctx, s) {
    ctx.translate(s.pivot.x, s.pivot.y);
    ctx.rotate(s.angle);
    ctx.translate(-s.pivot.x, -s.pivot.y);
  }

  drawSource(ctx, s) {
    const { full } = s;
    ctx.save();
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(full.x + (s.flipX ? full.w : 0), full.y + (s.flipY ? full.h : 0));
    ctx.scale(s.flipX ? -1 : 1, s.flipY ? -1 : 1);
    ctx.drawImage(s.source, 0, 0, full.w, full.h);
    ctx.restore();
  }

  drawClipped(ctx, s) {
    ctx.save();
    this.applyRotation(ctx, s);
    ctx.beginPath();
    ctx.rect(s.crop.x, s.crop.y, s.crop.w, s.crop.h);
    ctx.clip();
    this.drawSource(ctx, s);
    ctx.restore();
  }

  renderPreview() {
    const s = this.session;
    const ctx = s.preview.getContext('2d');
    ctx.clearRect(0, 0, s.preview.width, s.preview.height);
    ctx.drawImage(s.base, 0, 0);
    if (this.options.mode === 'crop') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      this.applyRotation(ctx, s);
      this.drawSource(ctx, s);
      ctx.restore();
    }
    this.drawClipped(ctx, s);
    this.app.setPreview(s.layer, s.preview);
  }

  drawOverlay(ctx, vp) {
    const s = this.session;
    if (!s) return;
    const px = 1 / vp.zoom;
    const c = s.crop;
    const accent = this.options.mode === 'crop' ? '#f5b642' : '#3b8eea';

    // Draw in the session's local frame: screen = pan + zoom * rotate(local).
    ctx.save();
    ctx.translate(vp.panX, vp.panY);
    ctx.scale(vp.zoom, vp.zoom);
    this.applyRotation(ctx, s);

    if (this.options.mode === 'crop') {
      ctx.setLineDash([4 * px, 4 * px]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = px;
      ctx.strokeRect(s.full.x, s.full.y, s.full.w, s.full.h);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3 * px;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = px;
    ctx.strokeRect(c.x, c.y, c.w, c.h);

    const rh = this.rotateHandlePoint();
    ctx.beginPath();
    ctx.moveTo(c.x + c.w / 2, c.y);
    ctx.lineTo(rh.x, rh.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, 5 * px, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.stroke();

    const size = HANDLE_SIZE * px;
    for (const handle of HANDLES) {
      const p = this.handlePoint(handle, c);
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
    }

    if (this.drag?.hit === ROTATE) {
      ctx.beginPath();
      ctx.arc(s.pivot.x, s.pivot.y, 3 * px, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }
    ctx.restore();

    if (this.drag) {
      const label =
        this.drag.hit === ROTATE
          ? `${roundDegrees(s.angle)}°`
          : `${Math.round(c.w)} × ${Math.round(c.h)} px`;
      const anchor = this.toWorld({ x: c.x + c.w / 2, y: c.y + c.h });
      const sp = vp.docToScreen(anchor.x, anchor.y);
      ctx.save();
      ctx.font = '11px "Segoe UI", sans-serif';
      const width = ctx.measureText(label).width + 12;
      const lx = sp.x - width / 2;
      const ly = sp.y + 12;
      ctx.fillStyle = 'rgba(20,20,20,0.85)';
      ctx.fillRect(lx, ly, width, 20);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 6, ly + 10);
      ctx.restore();
    }
  }
}
