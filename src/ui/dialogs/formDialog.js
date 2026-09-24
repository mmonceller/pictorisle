import { h } from '../../utils/dom.js';
import { clamp } from '../../utils/math.js';
import { openModal } from './Modal.js';

/**
 * Shows a form and resolves with the entered values, or null if cancelled.
 * Field: { key, label, type: 'number'|'range'|'select'|'checkbox'|'color', value, min, max, step, options }
 * onInput(values, setValue, changedKey) fires on every edit (for live previews / linked fields).
 */
export function formDialog({ title, fields, submitLabel = 'OK', onInput }) {
  return new Promise((resolve) => {
    const values = Object.fromEntries(fields.map((f) => [f.key, f.value]));
    const controls = {};
    let settled = false;
    let modal = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(result);
    };
    const setValue = (key, value) => {
      values[key] = value;
      controls[key]?.sync(value);
    };
    const handleInput = (key, value) => {
      values[key] = value;
      onInput?.({ ...values }, setValue, key);
    };

    const rows = fields.map((field) => {
      const control = createControl(field, (value) => handleInput(field.key, value));
      controls[field.key] = control;
      return h(
        'label',
        { class: `form-row form-row-${field.type}` },
        h('span', { class: 'form-label' }, field.label),
        control.element,
      );
    });

    modal = openModal({
      title,
      content: h('div', { class: 'form-grid' }, rows),
      buttons: [
        { label: 'Cancel', onClick: () => finish(null) },
        { label: submitLabel, primary: true, onClick: () => finish({ ...values }) },
      ],
      onClose: () => finish(null),
    });
  });
}

function createControl(field, onChange) {
  const { min, max, step = 1, value } = field;
  switch (field.type) {
    case 'range': {
      const slider = h('input', { type: 'range', min, max, step, value });
      const readout = h('input', { type: 'number', class: 'num', min, max, step, value });
      slider.addEventListener('input', () => {
        readout.value = slider.value;
        onChange(Number(slider.value));
      });
      readout.addEventListener('input', () => {
        const v = Number(readout.value);
        if (readout.value === '' || !Number.isFinite(v)) return;
        slider.value = v;
        onChange(clamp(v, min, max));
      });
      return {
        element: h('div', { class: 'range-control' }, slider, readout),
        sync: (v) => {
          slider.value = v;
          readout.value = v;
        },
      };
    }
    case 'select': {
      const select = h('select', { value }, field.options.map(([v, label]) => h('option', { value: v }, label)));
      select.addEventListener('change', () => onChange(select.value));
      return { element: select, sync: (v) => (select.value = v) };
    }
    case 'checkbox': {
      const input = h('input', { type: 'checkbox', checked: !!value });
      input.addEventListener('change', () => onChange(input.checked));
      return { element: input, sync: (v) => (input.checked = v) };
    }
    case 'color': {
      const input = h('input', { type: 'color', value });
      input.addEventListener('input', () => onChange(input.value));
      return { element: input, sync: (v) => (input.value = v) };
    }
    default: {
      const input = h('input', { type: 'number', min, max, step, value });
      input.addEventListener('input', () => {
        if (input.value !== '') onChange(Number(input.value));
      });
      return { element: input, sync: (v) => (input.value = v) };
    }
  }
}
