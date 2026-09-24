import { rgbToHsl, hslToRgb } from '../utils/color.js';

/** Applies a 256-entry lookup table to the RGB channels. */
function applyLut(data, lut) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

function buildLut(fn) {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = fn(v);
  return lut;
}

export const brightnessContrast = {
  id: 'brightnessContrast',
  label: 'Brightness/Contrast',
  params: [
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
  ],
  apply({ data }, { brightness, contrast }) {
    const c = contrast * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    const offset = brightness * 1.5;
    applyLut(data, buildLut((v) => factor * (v - 128) + 128 + offset));
  },
};

export const hueSaturation = {
  id: 'hueSaturation',
  label: 'Hue/Saturation',
  params: [
    { key: 'hue', label: 'Hue', min: -180, max: 180, default: 0 },
    { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
    { key: 'lightness', label: 'Lightness', min: -100, max: 100, default: 0 },
  ],
  apply({ data }, { hue, saturation, lightness }) {
    const sat = 1 + saturation / 100;
    const light = lightness / 100;
    for (let i = 0; i < data.length; i += 4) {
      let [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      h += hue;
      s = Math.min(1, s * sat);
      l = light > 0 ? l + (1 - l) * light : l * (1 + light);
      const [r, g, b] = hslToRgb(h, s, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  },
};

export const grayscale = {
  id: 'grayscale',
  label: 'Desaturate',
  apply({ data }) {
    for (let i = 0; i < data.length; i += 4) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = l;
    }
  },
};

export const invert = {
  id: 'invert',
  label: 'Invert',
  apply({ data }) {
    applyLut(data, buildLut((v) => 255 - v));
  },
};

export const sepia = {
  id: 'sepia',
  label: 'Sepia',
  apply({ data }) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = 0.393 * r + 0.769 * g + 0.189 * b;
      data[i + 1] = 0.349 * r + 0.686 * g + 0.168 * b;
      data[i + 2] = 0.272 * r + 0.534 * g + 0.131 * b;
    }
  },
};

export const posterize = {
  id: 'posterize',
  label: 'Posterize',
  params: [{ key: 'levels', label: 'Levels', min: 2, max: 32, default: 6 }],
  apply({ data }, { levels }) {
    const step = 255 / (levels - 1);
    applyLut(data, buildLut((v) => Math.round(v / step) * step));
  },
};

export const threshold = {
  id: 'threshold',
  label: 'Threshold',
  params: [{ key: 'level', label: 'Level', min: 1, max: 255, default: 128 }],
  apply({ data }, { level }) {
    for (let i = 0; i < data.length; i += 4) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = l >= level ? 255 : 0;
    }
  },
};
