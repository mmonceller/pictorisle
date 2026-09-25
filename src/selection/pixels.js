import { createCanvas } from '../utils/canvas.js';
import { selectionPath } from './shapes.js';

/** A same-size copy of `canvas` holding only the pixels inside the selection. */
export function liftSelection(canvas, sel) {
  const out = createCanvas(canvas.width, canvas.height);
  const ctx = out.getContext('2d');
  ctx.clip(selectionPath(sel));
  ctx.drawImage(canvas, 0, 0);
  return out;
}

/** The selection's bounding box cut out of `canvas`, transparent outside the selection shape. */
export function extractSelection(canvas, sel) {
  const out = createCanvas(sel.w, sel.h);
  const ctx = out.getContext('2d');
  ctx.translate(-sel.x, -sel.y);
  ctx.clip(selectionPath(sel));
  ctx.drawImage(canvas, 0, 0);
  return out;
}

/** Replaces the pixels inside the selection on `ctx` with the same pixels of the full-size `source`. */
export function replaceWithinSelection(ctx, source, sel) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clip(selectionPath(sel));
  ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}
