import { h } from '../../utils/dom.js';
import { normalizeHex } from '../../utils/color.js';
import { icon } from '../icons.js';

const PALETTE = [
  '#000000', '#404040', '#808080', '#c0c0c0', '#ffffff', '#7f1d1d', '#ef4444', '#f97316', '#f59e0b', '#facc15',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#78350f',
];

export class ColorPanel {
  constructor(app, el) {
    this.app = app;
    this.pickers = { primary: this.createPicker('primary'), secondary: this.createPicker('secondary') };

    this.primarySwatch = h('button', {
      class: 'swatch swatch-primary',
      title: 'Foreground color',
      onClick: () => this.pickers.primary.click(),
    });
    this.secondarySwatch = h('button', {
      class: 'swatch swatch-secondary',
      title: 'Background color',
      onClick: () => this.pickers.secondary.click(),
    });
    const swap = h(
      'button',
      { class: 'swatch-swap', title: 'Swap colors (X)', onClick: () => app.swapColors() },
      icon('swap', 14),
    );
    const reset = h(
      'button',
      { class: 'swatch-reset', title: 'Default colors (D)', onClick: () => app.resetColors() },
      h('span'),
      h('span'),
    );

    this.hexInput = h('input', { class: 'hex-input', type: 'text', maxLength: 7 });
    this.hexInput.addEventListener('change', () => {
      const hex = normalizeHex(this.hexInput.value);
      if (hex) app.setColor('primary', hex);
      else this.sync();
    });

    const palette = h(
      'div',
      { class: 'palette' },
      PALETTE.map((color) =>
        h('button', {
          class: 'palette-swatch',
          style: { background: color },
          title: `${color} — click: foreground, right-click: background`,
          onClick: () => app.setColor('primary', color),
          onContextMenu: (e) => {
            e.preventDefault();
            app.setColor('secondary', color);
          },
        }),
      ),
    );

    el.append(
      h('div', { class: 'panel-header' }, 'Color'),
      h(
        'div',
        { class: 'color-body' },
        h(
          'div',
          { class: 'swatch-stack' },
          this.secondarySwatch,
          this.primarySwatch,
          swap,
          reset,
          this.pickers.primary,
          this.pickers.secondary,
        ),
        h(
          'div',
          { class: 'color-fields' },
          h('label', { class: 'hex-label' }, 'Hex', this.hexInput),
          h('div', { class: 'color-help' }, 'Click a swatch to pick. Right-click the palette for background.'),
        ),
      ),
      palette,
    );

    app.bus.on('colors:changed', () => this.sync());
    this.sync();
  }

  createPicker(which) {
    const input = h('input', { type: 'color', class: 'hidden-picker', tabIndex: -1 });
    input.addEventListener('input', () => this.app.setColor(which, input.value));
    return input;
  }

  sync() {
    const { primary, secondary } = this.app.colors;
    this.primarySwatch.style.background = primary;
    this.secondarySwatch.style.background = secondary;
    this.pickers.primary.value = primary;
    this.pickers.secondary.value = secondary;
    this.hexInput.value = primary;
  }
}
