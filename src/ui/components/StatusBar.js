import { h } from '../../utils/dom.js';

export class StatusBar {
  constructor(app, el) {
    this.hint = h('span', { class: 'status-hint' });
    this.cursor = h('span', { class: 'status-cell' }, '—');
    this.selection = h('span', { class: 'status-cell' });
    this.size = h('span', { class: 'status-cell' });
    this.zoom = h('span', { class: 'status-cell' });
    el.append(
      this.hint,
      this.selection,
      this.cursor,
      this.size,
      this.zoom,
      h('span', { class: 'status-cell muted' }, 'Scroll: pan · Ctrl+Scroll: zoom · Space+drag: pan'),
    );

    app.bus.on('tool:changed', (tool) => (this.hint.textContent = tool.hint || tool.label));
    app.bus.on('pointer:moved', (p) => (this.cursor.textContent = `X ${Math.floor(p.x)}  Y ${Math.floor(p.y)}`));
    app.bus.on('view:changed', (vp) => (this.zoom.textContent = `${Math.round(vp.zoom * 1000) / 10}%`));

    const updateDoc = () => {
      const doc = app.doc;
      if (!doc) return;
      this.size.textContent = `${doc.width} × ${doc.height} px`;
      const sel = doc.selection;
      this.selection.textContent = sel ? `Selection ${sel.w} × ${sel.h}` : '';
    };
    app.bus.on('document:changed', updateDoc);
    app.bus.on('selection:changed', updateDoc);
  }
}
