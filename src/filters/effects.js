import { gaussianBlur as blur } from './utils/blur.js';
import { convolve3x3 } from './utils/convolve.js';

export const gaussianBlur = {
  id: 'gaussianBlur',
  label: 'Gaussian Blur',
  params: [{ key: 'radius', label: 'Radius (px)', min: 0.5, max: 60, step: 0.5, default: 4 }],
  apply(imageData, { radius }) {
    blur(imageData, radius);
  },
};

export const sharpen = {
  id: 'sharpen',
  label: 'Unsharp Mask',
  params: [
    { key: 'amount', label: 'Amount (%)', min: 1, max: 300, default: 100 },
    { key: 'radius', label: 'Radius (px)', min: 0.5, max: 10, step: 0.5, default: 1 },
  ],
  apply(imageData, { amount, radius }) {
    const blurred = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    blur(blurred, radius);
    const { data } = imageData;
    const k = amount / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] += (data[i] - blurred.data[i]) * k;
      data[i + 1] += (data[i + 1] - blurred.data[i + 1]) * k;
      data[i + 2] += (data[i + 2] - blurred.data[i + 2]) * k;
    }
  },
};

export const addNoise = {
  id: 'addNoise',
  label: 'Add Noise',
  params: [{ key: 'amount', label: 'Amount (%)', min: 1, max: 100, default: 20 }],
  apply({ data }, { amount }) {
    const strength = amount * 2.55;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 2 * strength;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
  },
};

export const pixelate = {
  id: 'pixelate',
  label: 'Pixelate',
  params: [{ key: 'size', label: 'Cell Size (px)', min: 2, max: 100, default: 10 }],
  apply({ data, width, height }, { size }) {
    for (let by = 0; by < height; by += size) {
      for (let bx = 0; bx < width; bx += size) {
        const maxY = Math.min(by + size, height);
        const maxX = Math.min(bx + size, width);
        const sum = [0, 0, 0, 0];
        let count = 0;
        for (let y = by; y < maxY; y++) {
          for (let x = bx; x < maxX; x++) {
            const i = (y * width + x) * 4;
            sum[0] += data[i];
            sum[1] += data[i + 1];
            sum[2] += data[i + 2];
            sum[3] += data[i + 3];
            count++;
          }
        }
        for (let y = by; y < maxY; y++) {
          for (let x = bx; x < maxX; x++) {
            const i = (y * width + x) * 4;
            data[i] = sum[0] / count;
            data[i + 1] = sum[1] / count;
            data[i + 2] = sum[2] / count;
            data[i + 3] = sum[3] / count;
          }
        }
      }
    }
  },
};

export const emboss = {
  id: 'emboss',
  label: 'Emboss',
  apply(imageData) {
    convolve3x3(imageData, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);
  },
};

export const findEdges = {
  id: 'findEdges',
  label: 'Find Edges',
  apply(imageData) {
    convolve3x3(imageData, [-1, -1, -1, -1, 8, -1, -1, -1, -1]);
  },
};
