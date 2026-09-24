import { h } from '../../utils/dom.js';

/** Opens a modal. Escape closes it; Enter clicks the primary button. */
export function openModal({ title, content, buttons = [], onClose }) {
  let primaryButton = null;
  let closed = false;

  const footer = h(
    'div',
    { class: 'modal-footer' },
    buttons.map((b) => {
      const button = h('button', { class: `btn ${b.primary ? 'btn-primary' : ''}`, onClick: b.onClick }, b.label);
      if (b.primary) primaryButton = button;
      return button;
    }),
  );
  const modal = h(
    'div',
    { class: 'modal', role: 'dialog' },
    h('div', { class: 'modal-header' }, title),
    h('div', { class: 'modal-body' }, content),
    footer,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, modal);

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && !['TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
      e.preventDefault();
      primaryButton?.click();
    }
    e.stopPropagation();
  };

  function close() {
    if (closed) return;
    closed = true;
    backdrop.remove();
    window.removeEventListener('keydown', onKey, true);
    onClose?.();
  }

  window.addEventListener('keydown', onKey, true);
  document.getElementById('modal-root').append(backdrop);
  requestAnimationFrame(() => modal.querySelector('input, select, .btn-primary')?.focus());
  return { close, element: modal };
}
