import { cloneCanvas, replaceCanvasContent } from '../utils/canvas.js';
import { intersectRect } from '../utils/math.js';
import { rafThrottle } from '../utils/throttle.js';
import { formDialog } from '../ui/dialogs/formDialog.js';

/** Runs a filter on the active layer (limited to the selection), with a live-preview dialog if it has params. */
export async function runFilter(app, filter) {
  const doc = app.doc;
  const layer = doc.activeLayer;
  const region = intersectRect(doc.region, doc.bounds);
  if (!region) return;

  const source = layer.ctx.getImageData(region.x, region.y, region.w, region.h);
  const preview = cloneCanvas(layer.canvas);
  const previewCtx = preview.getContext('2d');

  const render = (params) => {
    const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
    filter.apply(output, params);
    previewCtx.putImageData(output, region.x, region.y);
    app.setPreview(layer, preview);
  };

  const commit = () => {
    replaceCanvasContent(layer.canvas, preview);
    app.setPreview(null);
    app.commit(filter.label);
  };

  if (!filter.params?.length) {
    render({});
    commit();
    return;
  }

  const defaults = Object.fromEntries(filter.params.map((p) => [p.key, p.default]));
  render(defaults);
  let dialogOpen = true;
  const values = await formDialog({
    title: filter.label,
    fields: filter.params.map((p) => ({ ...p, type: p.type ?? 'range', value: p.default })),
    submitLabel: 'Apply',
    onInput: rafThrottle((params) => dialogOpen && render(params)),
  });
  dialogOpen = false;

  if (!values) {
    app.setPreview(null);
    return;
  }
  render(values);
  commit();
}
