import { intersectRect } from '../utils/math.js';

/**
 * A selection is `{ type, x, y, w, h }` where x/y/w/h is always its bounding box, so rectangle-based
 * code (regions, crops, readouts) keeps working. Types:
 *   rect    – the box itself (also the default when `type` is missing)
 *   ellipse – the ellipse inscribed in the box
 *   lasso   – a closed polygon through `points`
 * Selections are treated as immutable: every change produces a new object.
 */

export const rectSelection = ({ x, y, w, h }) => ({ type: 'rect', x, y, w, h });

export const ellipseSelection = ({ x, y, w, h }) => ({ type: 'ellipse', x, y, w, h });

export function lassoSelection(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const x = Math.floor(minX);
  const y = Math.floor(minY);
  return { type: 'lasso', points, x, y, w: Math.ceil(maxX) - x, h: Math.ceil(maxY) - y };
}

export const isRectSelection = (sel) => !sel.type || sel.type === 'rect';

const pathCache = new WeakMap();

/** The selection outline in document coordinates. */
export function selectionPath(sel) {
  let path = pathCache.get(sel);
  if (path) return path;
  path = new Path2D();
  if (sel.type === 'ellipse') {
    path.ellipse(sel.x + sel.w / 2, sel.y + sel.h / 2, sel.w / 2, sel.h / 2, 0, 0, Math.PI * 2);
  } else if (sel.type === 'lasso') {
    sel.points.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
    path.closePath();
  } else {
    path.rect(sel.x, sel.y, sel.w, sel.h);
  }
  pathCache.set(sel, path);
  return path;
}

/** The selection outline as a polygon (ellipses are sampled). */
export function selectionPolygon(sel) {
  if (sel.type === 'lasso') return sel.points;
  if (sel.type === 'ellipse') {
    const cx = sel.x + sel.w / 2;
    const cy = sel.y + sel.h / 2;
    const steps = 96;
    return Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return { x: cx + Math.cos(a) * (sel.w / 2), y: cy + Math.sin(a) * (sel.h / 2) };
    });
  }
  return [
    { x: sel.x, y: sel.y },
    { x: sel.x + sel.w, y: sel.y },
    { x: sel.x + sel.w, y: sel.y + sel.h },
    { x: sel.x, y: sel.y + sel.h },
  ];
}

export function translateSelection(sel, dx, dy) {
  const moved = { ...sel, x: sel.x + dx, y: sel.y + dy };
  if (sel.points) moved.points = sel.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  return moved;
}

/** Limits a selection to `bounds`; returns null when nothing of it is left inside. */
export function clampSelection(sel, bounds) {
  if (!sel) return null;
  const box = intersectRect(sel, bounds);
  if (!box) return null;
  return isRectSelection(sel) ? rectSelection(box) : sel;
}
