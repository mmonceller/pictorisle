import { Layer } from './Layer.js';
import { createCanvas } from '../utils/canvas.js';

export class Document {
  constructor(width, height, background = '#ffffff') {
    this.width = width;
    this.height = height;
    this.layers = [];
    this.activeIndex = 0;
    this.selection = null;
    this.layerCounter = 0;

    const base = new Layer(width, height, 'Background');
    if (background) {
      base.backgroundFill = background;
      base.ctx.fillStyle = background;
      base.ctx.fillRect(0, 0, width, height);
    }
    this.layers.push(base);
  }

  static fromImage(image) {
    const doc = new Document(image.naturalWidth || image.width, image.naturalHeight || image.height, null);
    doc.layers[0].ctx.drawImage(image, 0, 0);
    doc.layers[0].kind = 'image';
    return doc;
  }

  get activeLayer() {
    return this.layers[this.activeIndex];
  }

  get bounds() {
    return { x: 0, y: 0, w: this.width, h: this.height };
  }

  /** The current selection, or the whole canvas when nothing is selected. */
  get region() {
    return this.selection ?? this.bounds;
  }

  createLayer(name = `Layer ${++this.layerCounter}`) {
    return new Layer(this.width, this.height, name);
  }

  addLayer(layer, index = this.activeIndex + 1) {
    this.layers.splice(index, 0, layer);
    this.activeIndex = index;
    return layer;
  }

  removeLayer(index = this.activeIndex) {
    if (this.layers.length <= 1) return false;
    this.layers.splice(index, 1);
    if (index < this.activeIndex || this.activeIndex >= this.layers.length) this.activeIndex--;
    this.activeIndex = Math.max(0, this.activeIndex);
    return true;
  }

  moveLayer(from, to) {
    if (to < 0 || to >= this.layers.length || from === to) return false;
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, layer);
    this.activeIndex = to;
    return true;
  }

  mergeDown(index = this.activeIndex) {
    if (index <= 0) return false;
    const upper = this.layers[index];
    const lower = this.layers[index - 1];
    if (upper.visible) {
      lower.ctx.save();
      lower.ctx.globalAlpha = upper.opacity;
      lower.ctx.globalCompositeOperation = upper.blendMode;
      lower.ctx.drawImage(upper.canvas, 0, 0);
      lower.ctx.restore();
    }
    this.layers.splice(index, 1);
    this.activeIndex = index - 1;
    return true;
  }

  flatten() {
    const flat = new Layer(this.width, this.height, 'Background');
    flat.ctx.drawImage(this.composite(), 0, 0);
    this.layers = [flat];
    this.activeIndex = 0;
  }

  composite(target = createCanvas(this.width, this.height), sourceFor = (layer) => layer.canvas) {
    if (target.width !== this.width || target.height !== this.height) {
      target.width = this.width;
      target.height = this.height;
    }
    const ctx = target.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);
    for (const layer of this.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(sourceFor(layer), layer.offsetX, layer.offsetY);
    }
    ctx.restore();
    return target;
  }

  // ---- Whole-document transforms -------------------------------------------------

  transformLayers(width, height, draw) {
    for (const layer of this.layers) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      draw(ctx, layer.canvas);
      layer.setCanvas(canvas);
    }
    this.width = width;
    this.height = height;
    this.selection = null;
  }

  resize(width, height) {
    this.transformLayers(width, height, (ctx, src) => ctx.drawImage(src, 0, 0, width, height));
  }

  resizeCanvas(width, height, anchorX = 0.5, anchorY = 0.5) {
    const dx = Math.round((width - this.width) * anchorX);
    const dy = Math.round((height - this.height) * anchorY);
    this.transformLayers(width, height, (ctx, src) => ctx.drawImage(src, dx, dy));
  }

  crop(rect) {
    this.transformLayers(rect.w, rect.h, (ctx, src) => ctx.drawImage(src, -rect.x, -rect.y));
  }

  flip(direction) {
    const { width, height } = this;
    this.transformLayers(width, height, (ctx, src) => {
      if (direction === 'horizontal') ctx.setTransform(-1, 0, 0, 1, width, 0);
      else ctx.setTransform(1, 0, 0, -1, 0, height);
      ctx.drawImage(src, 0, 0);
    });
  }

  rotate(clockwise) {
    const newWidth = this.height;
    const newHeight = this.width;
    this.transformLayers(newWidth, newHeight, (ctx, src) => {
      if (clockwise) {
        ctx.translate(newWidth, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, newHeight);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(src, 0, 0);
    });
  }

  // ---- History support --------------------------------------------------------------

  snapshot() {
    return {
      width: this.width,
      height: this.height,
      activeIndex: this.activeIndex,
      layerCounter: this.layerCounter,
      selection: this.selection ? { ...this.selection } : null,
      layers: this.layers.map((layer) => layer.snapshot()),
    };
  }

  restore(snap) {
    this.width = snap.width;
    this.height = snap.height;
    this.activeIndex = snap.activeIndex;
    this.layerCounter = snap.layerCounter;
    this.selection = snap.selection ? { ...snap.selection } : null;
    this.layers = snap.layers.map((s) => Layer.fromSnapshot(s));
  }
}
