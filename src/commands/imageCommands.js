import { formDialog } from '../ui/dialogs/formDialog.js';
import { clamp, intersectRect } from '../utils/math.js';

const MAX_SIZE = 10000;
const ANCHORS = [
  ['0,0', 'Top Left'],
  ['0.5,0', 'Top'],
  ['1,0', 'Top Right'],
  ['0,0.5', 'Left'],
  ['0.5,0.5', 'Center'],
  ['1,0.5', 'Right'],
  ['0,1', 'Bottom Left'],
  ['0.5,1', 'Bottom'],
  ['1,1', 'Bottom Right'],
];

const toSize = (v) => Math.round(clamp(Number(v) || 1, 1, MAX_SIZE));

export function imageCommands(app) {
  const transform = (label, fn) => {
    app.activeTool.cancel();
    fn(app.doc);
    app.commit(label, 'all');
    app.viewport.fit();
  };

  return {
    async imageSize() {
      const doc = app.doc;
      const ratio = doc.width / doc.height;
      const values = await formDialog({
        title: 'Image Size',
        submitLabel: 'Resize',
        fields: [
          { key: 'width', label: 'Width (px)', type: 'number', min: 1, max: MAX_SIZE, value: doc.width },
          { key: 'height', label: 'Height (px)', type: 'number', min: 1, max: MAX_SIZE, value: doc.height },
          { key: 'constrain', label: 'Constrain Proportions', type: 'checkbox', value: true },
        ],
        onInput: (v, set, key) => {
          if (!v.constrain) return;
          if (key === 'width') set('height', Math.max(1, Math.round(v.width / ratio)));
          if (key === 'height') set('width', Math.max(1, Math.round(v.height * ratio)));
        },
      });
      if (!values) return;
      const width = toSize(values.width);
      const height = toSize(values.height);
      if (width === doc.width && height === doc.height) return;
      transform('Image Size', (d) => d.resize(width, height));
    },

    async canvasSize() {
      const doc = app.doc;
      const values = await formDialog({
        title: 'Canvas Size',
        submitLabel: 'Resize',
        fields: [
          { key: 'width', label: 'Width (px)', type: 'number', min: 1, max: MAX_SIZE, value: doc.width },
          { key: 'height', label: 'Height (px)', type: 'number', min: 1, max: MAX_SIZE, value: doc.height },
          { key: 'anchor', label: 'Anchor', type: 'select', value: '0.5,0.5', options: ANCHORS },
        ],
      });
      if (!values) return;
      const width = toSize(values.width);
      const height = toSize(values.height);
      if (width === doc.width && height === doc.height) return;
      const [ax, ay] = values.anchor.split(',').map(Number);
      transform('Canvas Size', (d) => {
        d.resizeCanvas(width, height, ax, ay);
        const base = d.layers[0];
        if (base.name === 'Background') {
          base.ctx.save();
          base.ctx.globalCompositeOperation = 'destination-over';
          base.ctx.fillStyle = app.colors.secondary;
          base.ctx.fillRect(0, 0, width, height);
          base.ctx.restore();
        }
      });
    },

    cropToSelection() {
      const rect = intersectRect(app.doc.selection, app.doc.bounds);
      if (!rect) {
        app.toast('Make a selection to crop to');
        return;
      }
      transform('Crop', (d) => d.crop(rect));
    },

    rotateCW: () => transform('Rotate 90° CW', (d) => d.rotate(true)),
    rotateCCW: () => transform('Rotate 90° CCW', (d) => d.rotate(false)),
    flipHorizontal: () => transform('Flip Horizontal', (d) => d.flip('horizontal')),
    flipVertical: () => transform('Flip Vertical', (d) => d.flip('vertical')),
  };
}
