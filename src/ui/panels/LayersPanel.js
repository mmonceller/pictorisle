import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { drawThumbnail } from '../thumbnail.js';
import { BLEND_MODES } from '../../core/blendModes.js';
import { createDropdown } from '../controls/Dropdown.js';

export class LayersPanel {
  constructor(app, el) {
    this.app = app;

    this.blendSelect = createDropdown({
      options: BLEND_MODES,
      className: 'blend-select',
      title: 'Blend mode',
      onChange: (value) => {
        app.doc.activeLayer.blendMode = value;
        app.commit('Blend Mode', []);
      },
    });
    this.opacityValue = h('span', { class: 'opacity-value' });
    this.opacityRange = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      onInput: (e) => {
        app.doc.activeLayer.opacity = Number(e.target.value) / 100;
        this.opacityValue.textContent = `${e.target.value}%`;
        app.requestRender();
      },
      onChange: () => app.commit('Layer Opacity', []),
    });
    this.list = h('div', { class: 'layer-list' });

    const button = (iconName, title, command) =>
      h('button', { class: 'icon-button', title, onClick: () => app.commands.run(command) }, icon(iconName, 16));

    el.append(
      h('div', { class: 'panel-header' }, 'Layers'),
      h(
        'div',
        { class: 'layer-props' },
        this.blendSelect,
        h('label', { class: 'opacity-label' }, 'Opacity', this.opacityRange, this.opacityValue),
      ),
      this.list,
      h(
        'div',
        { class: 'panel-footer' },
        button('plus', 'New layer', 'newLayer'),
        button('copy', 'Duplicate layer', 'duplicateLayer'),
        button('arrowUp', 'Move layer up', 'moveLayerUp'),
        button('arrowDown', 'Move layer down', 'moveLayerDown'),
        button('merge', 'Merge down', 'mergeDown'),
        button('trash', 'Delete layer', 'deleteLayer'),
      ),
    );

    app.bus.on('document:changed', () => this.render());
  }

  render() {
    const doc = this.app.doc;
    if (!doc) return;
    const active = doc.activeLayer;
    const opacity = Math.round(active.opacity * 100);
    this.blendSelect.value = active.blendMode;
    this.opacityRange.value = opacity;
    this.opacityValue.textContent = `${opacity}%`;

    const items = [];
    for (let i = doc.layers.length - 1; i >= 0; i--) items.push(this.renderItem(doc.layers[i], i));
    this.list.replaceChildren(...items);
  }

  renderItem(layer, index) {
    const { app } = this;
    const doc = app.doc;

    const thumb = h('canvas', { class: 'layer-thumb', width: 48, height: 36 });
    drawThumbnail(thumb, layer.canvas);

    const name = h(
      'span',
      {
        class: 'layer-name',
        title: 'Double-click to rename',
        onDblClick: (e) => {
          e.stopPropagation();
          this.startRename(name, layer);
        },
      },
      layer.name,
    );

    const eye = h(
      'button',
      {
        class: `icon-button eye${layer.visible ? '' : ' off'}`,
        title: 'Toggle visibility',
        onClick: (e) => {
          e.stopPropagation();
          layer.visible = !layer.visible;
          app.commit(layer.visible ? 'Show Layer' : 'Hide Layer', []);
        },
      },
      icon(layer.visible ? 'eye' : 'eyeOff', 16),
    );

    const item = h(
      'div',
      {
        class: `layer-item${index === doc.activeIndex ? ' active' : ''}`,
        draggable: 'true',
        onClick: () => {
          if (doc.activeIndex === index) return;
          doc.activeIndex = index;
          app.notifyChanged();
        },
      },
      eye,
      thumb,
      name,
    );

    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-layer-index', String(index));
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('application/x-layer-index')) return;
      e.preventDefault();
      item.classList.add('drop-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drop-target');
      const from = Number(e.dataTransfer.getData('application/x-layer-index'));
      if (doc.moveLayer(from, index)) app.commit('Reorder Layers', []);
    });

    return item;
  }

  startRename(span, layer) {
    const input = h('input', { class: 'rename-input', type: 'text', value: layer.name });
    span.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const newName = input.value.trim();
      if (save && newName && newName !== layer.name) {
        layer.name = newName;
        this.app.commit('Rename Layer', []);
      } else {
        this.render();
      }
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  }
}
