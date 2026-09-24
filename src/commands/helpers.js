import { createCanvas } from '../utils/canvas.js';

/**
 * Adds `image` as a new layer and opens it in the Transform tool.
 * Without a position it is scaled down to fit and centered.
 */
export function placeImageAsLayer(app, image, name = 'Placed Image', position = null) {
  const doc = app.doc;
  const layer = doc.createLayer(name);
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  let w = iw;
  let h = ih;
  if (!position) {
    const scale = Math.min(1, doc.width / iw, doc.height / ih);
    w = iw * scale;
    h = ih * scale;
    position = { x: (doc.width - w) / 2, y: (doc.height - h) / 2 };
  }
  layer.ctx.imageSmoothingQuality = 'high';
  layer.ctx.drawImage(image, Math.round(position.x), Math.round(position.y), w, h);
  doc.addLayer(layer);
  app.commit(`Place ${name}`, [layer]);
  app.setTool('transform');
}

/** Copies a rectangle of a layer into a new canvas. */
export function extractRegion(layer, rect) {
  const canvas = createCanvas(rect.w, rect.h);
  canvas.getContext('2d').drawImage(layer.canvas, -rect.x, -rect.y);
  return canvas;
}
