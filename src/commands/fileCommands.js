import { Document } from '../core/Document.js';
import { createCanvas } from '../utils/canvas.js';
import { pickFile, loadImage, downloadCanvas, stripExtension } from '../utils/file.js';
import { formDialog } from '../ui/dialogs/formDialog.js';
import { placeImageAsLayer } from './helpers.js';

const BACKGROUNDS = [
  ['white', 'White'],
  ['black', 'Black'],
  ['transparent', 'Transparent'],
  ['primary', 'Foreground Color'],
  ['secondary', 'Background Color'],
];

export function fileCommands(app) {
  const openImage = async () => {
    const file = await pickFile('image/*');
    if (!file) return null;
    try {
      return { file, image: await loadImage(file) };
    } catch {
      app.toast(`Could not open ${file.name}`);
      return null;
    }
  };

  const exportAs = (type, ext, background = null) => () => {
    const doc = app.doc;
    let canvas = doc.composite();
    if (background) {
      const flat = createCanvas(doc.width, doc.height);
      const ctx = flat.getContext('2d');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, doc.width, doc.height);
      ctx.drawImage(canvas, 0, 0);
      canvas = flat;
    }
    const filename = `${app.docName}.${ext}`;
    downloadCanvas(canvas, filename, type);
    app.toast(`Exported ${filename}`);
  };

  return {
    async newDocument() {
      const values = await formDialog({
        title: 'New Document',
        submitLabel: 'Create',
        fields: [
          { key: 'width', label: 'Width (px)', type: 'number', min: 1, max: 10000, value: app.doc.width },
          { key: 'height', label: 'Height (px)', type: 'number', min: 1, max: 10000, value: app.doc.height },
          { key: 'background', label: 'Background', type: 'select', value: 'white', options: BACKGROUNDS },
        ],
      });
      if (!values) return;
      const width = Math.round(Math.min(10000, Math.max(1, values.width)));
      const height = Math.round(Math.min(10000, Math.max(1, values.height)));
      const background = {
        white: '#ffffff',
        black: '#000000',
        transparent: null,
        primary: app.colors.primary,
        secondary: app.colors.secondary,
      }[values.background];
      app.newDocument(width, height, background);
    },

    async open() {
      const result = await openImage();
      if (!result) return;
      app.loadDocument(Document.fromImage(result.image), `Open`, stripExtension(result.file.name));
    },

    async placeImage() {
      const result = await openImage();
      if (result) placeImageAsLayer(app, result.image, stripExtension(result.file.name));
    },

    exportPng: exportAs('image/png', 'png'),
    exportJpeg: exportAs('image/jpeg', 'jpg', '#ffffff'),
    exportWebp: exportAs('image/webp', 'webp'),
  };
}
