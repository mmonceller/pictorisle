import { createCanvas } from './canvas.js';
import { hexToRgb } from './color.js';

/** Renders a round brush stamp; hardness (0..1) controls where the soft falloff begins. */
export function createBrushTip(size, hardness, color) {
  const dim = Math.max(1, Math.ceil(size) + 2);
  const canvas = createCanvas(dim, dim);
  const ctx = canvas.getContext('2d');
  const { r, g, b } = hexToRgb(color);
  const center = dim / 2;
  const radius = Math.max(0.5, size / 2);

  if (hardness >= 0.99 || size <= 2) {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
  } else {
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(hardness, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
  }
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}
