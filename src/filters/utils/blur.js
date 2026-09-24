/** Box sizes whose repeated application approximates a gaussian of the given sigma. */
function boxesForGauss(sigma, n) {
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower--;
  const upper = lower + 2;
  const m = Math.round((12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) / (-4 * lower - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? lower : upper));
}

/** One sliding-window box blur pass along rows (horizontal) or columns, with clamped edges. */
function blurPass(src, dst, width, height, radius, horizontal) {
  const length = horizontal ? width : height;
  const lines = horizontal ? height : width;
  const step = horizontal ? 4 : width * 4;
  const norm = 1 / (2 * radius + 1);
  const last = length - 1;

  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * width * 4 : line * 4;
    for (let c = 0; c < 4; c++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += src[base + Math.min(last, Math.max(0, k)) * step + c];
      for (let i = 0; i < length; i++) {
        dst[base + i * step + c] = acc * norm;
        const add = Math.min(i + radius + 1, last);
        const remove = Math.max(i - radius, 0);
        acc += src[base + add * step + c] - src[base + remove * step + c];
      }
    }
  }
}

/** Gaussian blur on RGBA ImageData in place, using premultiplied alpha to avoid dark fringes. */
export function gaussianBlur(imageData, sigma) {
  if (sigma <= 0) return;
  const { data, width, height } = imageData;
  const n = data.length;
  const a = new Float32Array(n);
  const b = new Float32Array(n);

  for (let i = 0; i < n; i += 4) {
    const alpha = data[i + 3] / 255;
    a[i] = data[i] * alpha;
    a[i + 1] = data[i + 1] * alpha;
    a[i + 2] = data[i + 2] * alpha;
    a[i + 3] = data[i + 3];
  }

  for (const size of boxesForGauss(sigma, 3)) {
    const radius = (size - 1) / 2;
    if (radius < 1) continue;
    blurPass(a, b, width, height, radius, true);
    blurPass(b, a, width, height, radius, false);
  }

  for (let i = 0; i < n; i += 4) {
    const alpha = a[i + 3];
    data[i + 3] = alpha;
    if (alpha > 0) {
      const k = 255 / alpha;
      data[i] = a[i] * k;
      data[i + 1] = a[i + 1] * k;
      data[i + 2] = a[i + 2] * k;
    } else {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
}
