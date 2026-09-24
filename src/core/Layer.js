import { createCanvas, cloneCanvas } from '../utils/canvas.js';

let nextId = 1;

export class Layer {
  constructor(width, height, name = 'Layer') {
    this.id = nextId++;
    this.name = name;
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

  duplicate(name = `${this.name} copy`) {
    const layer = new Layer(1, 1, name);
    layer.setCanvas(cloneCanvas(this.canvas));
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
    layer.visible = snap.visible;
    layer.opacity = snap.opacity;
    layer.blendMode = snap.blendMode;
    layer.version = snap.version;
    layer.snapshotCache = { version: snap.version, canvas: snap.canvas };
    return layer;
  }
}
