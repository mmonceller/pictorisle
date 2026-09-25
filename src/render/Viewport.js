import { createCanvas } from '../utils/canvas.js';
import { clamp } from '../utils/math.js';
import { isRectSelection, selectionPath } from '../selection/index.js';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 64;
const ZOOM_STEPS = [0.02, 0.03, 0.05, 0.0833, 0.125, 0.1667, 0.25, 0.3333, 0.5, 0.6667, 1, 1.5, 2, 3, 4, 5, 6, 8, 12, 16, 24, 32, 48, 64];

export class Viewport {
  constructor(app, canvas) {
    this.app = app;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = canvas.parentElement;

    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.compositeCanvas = createCanvas(1, 1);
    this.contentDirty = true;
    this.frameRequested = false;
    this.needsFit = false;
    this.antsOffset = 0;
    this.checker = this.createCheckerPattern();

    new ResizeObserver(() => this.resize()).observe(this.container);
    setInterval(() => {
      if (!this.app.doc?.selection) return;
      this.antsOffset = (this.antsOffset + 1) % 8;
      this.requestRender(false);
    }, 90);
  }

  createCheckerPattern() {
    const tile = createCanvas(16, 16);
    const ctx = tile.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillRect(8, 8, 8, 8);
    return this.ctx.createPattern(tile, 'repeat');
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    if (this.needsFit) this.fit();
    this.render();
  }

  // ---- View transforms ----------------------------------------------------------------

  fit() {
    const doc = this.app.doc;
    if (!doc || !this.width) {
      this.needsFit = true;
      return;
    }
    this.needsFit = false;
    const pad = 32;
    const zoom = Math.min((this.width - pad * 2) / doc.width, (this.height - pad * 2) / doc.height, 1);
    this.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.center();
  }

  actualSize() {
    this.zoom = 1;
    this.center();
  }

  center() {
    const doc = this.app.doc;
    this.panX = Math.round((this.width - doc.width * this.zoom) / 2);
    this.panY = Math.round((this.height - doc.height * this.zoom) / 2);
    this.changed();
  }

  setZoom(zoom, cx = this.width / 2, cy = this.height / 2) {
    zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const docX = (cx - this.panX) / this.zoom;
    const docY = (cy - this.panY) / this.zoom;
    this.zoom = zoom;
    this.panX = cx - docX * zoom;
    this.panY = cy - docY * zoom;
    this.changed();
  }

  zoomBy(factor, cx, cy) {
    this.setZoom(this.zoom * factor, cx, cy);
  }

  zoomStep(direction, cx, cy) {
    const eps = 1e-3;
    const next =
      direction > 0
        ? ZOOM_STEPS.find((z) => z > this.zoom + eps) ?? MAX_ZOOM
        : [...ZOOM_STEPS].reverse().find((z) => z < this.zoom - eps) ?? MIN_ZOOM;
    this.setZoom(next, cx, cy);
  }

  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this.changed();
  }

  changed() {
    this.app.bus.emit('view:changed', this);
    this.requestRender(false);
  }

  screenToDoc(sx, sy) {
    return { x: (sx - this.panX) / this.zoom, y: (sy - this.panY) / this.zoom };
  }

  docToScreen(x, y) {
    return { x: x * this.zoom + this.panX, y: y * this.zoom + this.panY };
  }

  // ---- Rendering ----------------------------------------------------------------------

  /** `content` = false re-draws only overlays (cursor, selection) without re-compositing layers. */
  requestRender(content = true) {
    if (content) this.contentDirty = true;
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.render();
    });
  }

  render() {
    const { ctx, app } = this;
    const doc = app.doc;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, this.width, this.height);
    if (!doc) return;

    if (this.contentDirty) {
      doc.composite(this.compositeCanvas, (layer) => app.getLayerSource(layer));
      this.contentDirty = false;
    }

    const x = this.panX;
    const y = this.panY;
    const w = doc.width * this.zoom;
    const h = doc.height * this.zoom;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = this.checker;
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = this.zoom < 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.compositeCanvas, x, y, w, h);
    ctx.restore();

    if (doc.selection) this.drawSelection(doc.selection);
    app.activeTool?.drawOverlay(ctx, this);
  }

  drawSelection(sel) {
    if (!isRectSelection(sel)) {
      this.drawSelectionPath(sel);
      return;
    }
    const { ctx } = this;
    const p = this.docToScreen(sel.x, sel.y);
    const x = Math.round(p.x) + 0.5;
    const y = Math.round(p.y) + 0.5;
    const w = Math.round(sel.w * this.zoom);
    const h = Math.round(sel.h * this.zoom);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#000000';
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -this.antsOffset;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  drawSelectionPath(sel) {
    const { ctx, zoom } = this;
    const path = selectionPath(sel);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(zoom, zoom);
    ctx.lineWidth = 1 / zoom;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.stroke(path);
    ctx.strokeStyle = '#000000';
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.lineDashOffset = -this.antsOffset / zoom;
    ctx.stroke(path);
    ctx.restore();
  }
}
