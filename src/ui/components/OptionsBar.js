import { h } from '../../utils/dom.js';
import { clamp } from '../../utils/math.js';
import { icon } from '../icons.js';

/** Renders the active tool's `schema` as editable controls bound to `tool.options`. */
export class OptionsBar {
  constructor(app, el) {
    this.app = app;
    this.el = el;
    app.bus.on('tool:changed', () => this.render());
    app.bus.on('tool:options', () => this.render());
  }

  render() {
    const tool = this.app.activeTool;
    this.el.replaceChildren(
      h('div', { class: 'options-tool' }, icon(tool.icon, 16), h('span', {}, tool.label)),
      ...tool.schema.map((field) => this.renderField(tool, field)),
    );
  }

  renderField(tool, field) {
    const value = tool.options[field.key];
    const set = (v) => {
      tool.options[field.key] = v;
      tool.onOptionsChange(field.key);
      this.app.viewport.requestRender(false);
    };

    switch (field.type) {
      case 'range': {
        const slider = h('input', { type: 'range', min: field.min, max: field.max, step: field.step ?? 1, value });
        const readout = h('input', { type: 'number', class: 'num', min: field.min, max: field.max, value });
        slider.addEventListener('input', () => {
          readout.value = slider.value;
          set(Number(slider.value));
        });
        readout.addEventListener('change', () => {
          const v = clamp(Number(readout.value) || field.min, field.min, field.max);
          readout.value = slider.value = v;
          set(v);
        });
        return h('label', { class: 'option' }, field.label, slider, readout, field.unit ?? '');
      }
      case 'select':
        return h(
          'label',
          { class: 'option' },
          field.label,
          h(
            'select',
            { value, onChange: (e) => set(e.target.value) },
            field.options.map(([v, label]) => h('option', { value: v }, label)),
          ),
        );
      case 'checkbox':
        return h(
          'label',
          { class: 'option' },
          h('input', { type: 'checkbox', checked: !!value, onChange: (e) => set(e.target.checked) }),
          field.label,
        );
      default:
        return null;
    }
  }
}
