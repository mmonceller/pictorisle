import { createCanvas, cloneCanvas } from '../utils/canvas.js';
import { selectionPath } from '../selection/shapes.js';

let nextId = 1;

export class Layer {
  constructor(width, height, name = 'Layer') {
    this.id = nextId++;
    this.name = name;
    // 'image' for layers created from image files/clipboard images, otherwise 'raster'.
    this.kind = 'raster';
    // Set on an opaque Background layer: vacated pixels are refilled with it instead of turning transparent.
    this.backgroundFill = null;
    this.setCanvas(createCanvas(width, height));
    this.visible = true;
    this.opacity = 1;
    this.blendMode = 'source-over';
    // Transient offset used while dragging with the Move tool.
    this.offsetX = 0;
    this.offsetY = 0;
    // Pixel version; history snapshots reuse a cached copy while it is unchanged.
    this.version = 0;
    this.snapshotCache = null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  touch() {
    this.version++;
  }

  /**
   * Clears a selection-shaped area (or a plain rect) on `ctx` (defaults to this layer),
   * refilling it with the background fill if set.
   */
  erase(sel, ctx = this.ctx) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clip(selectionPath(sel));
    if (this.backgroundFill) {
      ctx.fillStyle = this.backgroundFill;
      ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    } else {
      ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
    }
    ctx.restore();
  }

  duplicate(name = `${this.name} copy`) {
    const layer = new Layer(1, 1, name);
    layer.setCanvas(cloneCanvas(this.canvas));
    layer.kind = this.kind;
    layer.visible = this.visible;
    layer.opacity = this.opacity;
    layer.blendMode = this.blendMode;
    return layer;
  }

  snapshot() {
    if (!this.snapshotCache || this.snapshotCache.version !== this.version) {
      this.snapshotCache = { version: this.version, canvas: cloneCanvas(this.canvas) };
    }
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      backgroundFill: this.backgroundFill,
      visible: this.visible,
      opacity: this.opacity,
      blendMode: this.blendMode,
      version: this.version,
      canvas: this.snapshotCache.canvas,
    };
  }

  static fromSnapshot(snap) {
    const layer = new Layer(1, 1, snap.name);
    layer.id = snap.id;
    layer.setCanvas(cloneCanvas(snap.canvas));
    layer.kind = snap.kind;
    layer.backgroundFill = snap.backgroundFill;
    layer.visible = snap.visible;
    layer.opacity = snap.opacity;
    layer.blendMode = snap.blendMode;
    layer.version = snap.version;
    layer.snapshotCache = { version: snap.version, canvas: snap.canvas };
    return layer;
  }
}
