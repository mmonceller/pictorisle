import { h } from '../../utils/dom.js';
import { clamp } from '../../utils/math.js';
import { icon } from '../icons.js';
import { createDropdown } from '../controls/Dropdown.js';

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
      case 'number': {
        const input = h('input', { type: 'number', class: 'num', min: field.min, max: field.max, step: field.step ?? 1, value });
        input.addEventListener('change', () => {
          const v = clamp(Number(input.value) || 0, field.min, field.max);
          input.value = v;
          set(v);
        });
        return h('label', { class: 'option' }, field.label, input, field.unit ?? '');
      }
      case 'select':
        return h(
          'label',
          { class: 'option' },
          field.label,
          createDropdown({ options: field.options, value, onChange: set }),
        );
      case 'button':
        return h(
          'button',
          { class: `option-button${field.primary ? ' primary' : ''}`, title: field.title, onClick: field.action },
          field.label,
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
