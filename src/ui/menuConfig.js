import { ADJUSTMENTS, EFFECTS } from '../filters/index.js';

const SEPARATOR = { separator: true };
const hasSelection = (app) => !!app.doc.selection;

const filterItem = (filter) => ({
  label: filter.params?.length ? `${filter.label}…` : filter.label,
  command: `filter.${filter.id}`,
});

export const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'New…', command: 'newDocument' },
      { label: 'Open…', command: 'open' },
      { label: 'Place Image as Layer…', command: 'placeImage' },
      SEPARATOR,
      { label: 'Export as PNG', command: 'exportPng' },
      { label: 'Export as JPEG', command: 'exportJpeg' },
      { label: 'Export as WebP', command: 'exportWebp' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', command: 'undo', enabled: (app) => app.history.canUndo },
      { label: 'Redo', command: 'redo', enabled: (app) => app.history.canRedo },
      SEPARATOR,
      { label: 'Cut', command: 'cut' },
      { label: 'Copy', command: 'copy' },
      { label: 'Paste', command: 'paste', enabled: (app) => !!app.clipboard },
      { label: 'Clear', command: 'clearSelection', enabled: hasSelection },
      SEPARATOR,
      { label: 'Fill with Foreground', command: 'fillPrimary' },
      { label: 'Fill with Background', command: 'fillSecondary' },
    ],
  },
  {
    label: 'Image',
    items: [
      { header: 'Adjustments' },
      ...ADJUSTMENTS.map(filterItem),
      SEPARATOR,
      { label: 'Image Size…', command: 'imageSize' },
      { label: 'Canvas Size…', command: 'canvasSize' },
      { label: 'Crop to Selection', command: 'cropToSelection', enabled: hasSelection },
      SEPARATOR,
      { label: 'Rotate 90° Clockwise', command: 'rotateCW' },
      { label: 'Rotate 90° Counter-Clockwise', command: 'rotateCCW' },
      { label: 'Flip Horizontal', command: 'flipHorizontal' },
      { label: 'Flip Vertical', command: 'flipVertical' },
    ],
  },
  {
    label: 'Layer',
    items: [
      { label: 'New Layer', command: 'newLayer' },
      { label: 'Duplicate Layer', command: 'duplicateLayer' },
      { label: 'Delete Layer', command: 'deleteLayer', enabled: (app) => app.doc.layers.length > 1 },
      SEPARATOR,
      {
        label: 'Free Transform (Resize / Crop / Rotate)',
        command: 'freeTransform',
        enabled: (app) => app.tools.get('transform').isAvailable(),
      },
      { label: 'Flip Layer Horizontal', command: 'flipLayerHorizontal' },
      { label: 'Flip Layer Vertical', command: 'flipLayerVertical' },
      { label: 'Crop Layer to Selection', command: 'cropLayerToSelection', enabled: hasSelection },
      SEPARATOR,
      { label: 'Bring Forward', command: 'moveLayerUp' },
      { label: 'Send Backward', command: 'moveLayerDown' },
      SEPARATOR,
      { label: 'Merge Down', command: 'mergeDown', enabled: (app) => app.doc.activeIndex > 0 },
      { label: 'Flatten Image', command: 'flatten' },
    ],
  },
  {
    label: 'Select',
    items: [
      { label: 'All', command: 'selectAll' },
      { label: 'Deselect', command: 'deselect', enabled: hasSelection },
    ],
  },
  {
    label: 'Filter',
    items: EFFECTS.map(filterItem),
  },
  {
    label: 'View',
    items: [
      { label: 'Zoom In', command: 'zoomIn' },
      { label: 'Zoom Out', command: 'zoomOut' },
      { label: 'Fit on Screen', command: 'fitToScreen' },
      { label: 'Actual Pixels', command: 'actualSize' },
    ],
  },
];
