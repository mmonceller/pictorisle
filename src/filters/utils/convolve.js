/** Applies a 3x3 kernel to the RGB channels of ImageData in place (alpha untouched). */
export function convolve3x3(imageData, kernel, offset = 0) {
  const { data, width, height } = imageData;
  const src = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        const sy = Math.min(height - 1, Math.max(0, y + ky));
        for (let kx = -1; kx <= 1; kx++) {
          const sx = Math.min(width - 1, Math.max(0, x + kx));
          const i = (sy * width + sx) * 4;
          const w = kernel[(ky + 1) * 3 + (kx + 1)];
          r += src[i] * w;
          g += src[i + 1] * w;
          b += src[i + 2] * w;
        }
      }
      const o = (y * width + x) * 4;
      data[o] = r + offset;
      data[o + 1] = g + offset;
      data[o + 2] = b + offset;
    }
  }
}
