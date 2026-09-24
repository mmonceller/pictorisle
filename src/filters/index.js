import * as adjustments from './adjustments.js';
import * as effects from './effects.js';

export const ADJUSTMENTS = [
  adjustments.brightnessContrast,
  adjustments.hueSaturation,
  adjustments.grayscale,
  adjustments.invert,
  adjustments.sepia,
  adjustments.posterize,
  adjustments.threshold,
];

export const EFFECTS = [
  effects.gaussianBlur,
  effects.sharpen,
  effects.addNoise,
  effects.pixelate,
  effects.emboss,
  effects.findEdges,
];

export const FILTERS = [...ADJUSTMENTS, ...EFFECTS];
