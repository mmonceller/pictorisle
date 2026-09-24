/**
 * Flood-fills `imageData` in place starting at (startX, startY).
 * `color` is { r, g, b, a } with a in 0..1. Returns false if nothing was filled.
 */
export function floodFill(imageData, startX, startY, color, options = {}) {
  const { tolerance = 32, contiguous = true, bounds = null } = options;
  const { width, height, data } = imageData;
  const x0 = bounds ? Math.max(0, bounds.x) : 0;
  const y0 = bounds ? Math.max(0, bounds.y) : 0;
  const x1 = bounds ? Math.min(width, bounds.x + bounds.w) : width;
  const y1 = bounds ? Math.min(height, bounds.y + bounds.h) : height;
  if (startX < x0 || startX >= x1 || startY < y0 || startY >= y1) return false;

  const start = (startY * width + startX) * 4;
  const [tr, tg, tb, ta] = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const matches = (i) =>
    Math.abs(data[i] - tr) <= tolerance &&
    Math.abs(data[i + 1] - tg) <= tolerance &&
    Math.abs(data[i + 2] - tb) <= tolerance &&
    Math.abs(data[i + 3] - ta) <= tolerance;

  const a = color.a;
  const paint = (i) => {
    const da = data[i + 3] / 255;
    const outA = a + da * (1 - a);
    if (outA <= 0) return;
    data[i] = (color.r * a + data[i] * da * (1 - a)) / outA;
    data[i + 1] = (color.g * a + data[i + 1] * da * (1 - a)) / outA;
    data[i + 2] = (color.b * a + data[i + 2] * da * (1 - a)) / outA;
    data[i + 3] = outA * 255;
  };

  if (!contiguous) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        if (matches(i)) paint(i);
      }
    }
    return true;
  }

  const visited = new Uint8Array(width * height);
  const stack = [startX, startY];
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    const p = y * width + x;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (!matches(i)) continue;
    paint(i);
    if (x > x0) stack.push(x - 1, y);
    if (x < x1 - 1) stack.push(x + 1, y);
    if (y > y0) stack.push(x, y - 1);
    if (y < y1 - 1) stack.push(x, y + 1);
  }
  return true;
}
