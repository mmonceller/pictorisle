import { intersectRect } from './math.js';

/** Bounding box of non-transparent pixels in `canvas` (optionally within `region`), or null if empty. */
export function contentBounds(canvas, region = null) {
  const full = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const r = intersectRect(region ? roundRect(region) : full, full);
  if (!r) return null;

  const { data } = canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h);
  let minX = r.w;
  let minY = r.h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < r.h; y++) {
    const row = y * r.w * 4;
    for (let x = 0; x < r.w; x++) {
      if (data[row + x * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: r.x + minX, y: r.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function roundRect({ x, y, w, h }) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  return { x: x0, y: y0, w: Math.ceil(x + w) - x0, h: Math.ceil(y + h) - y0 };
}
