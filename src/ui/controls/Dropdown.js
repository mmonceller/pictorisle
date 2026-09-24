import { h } from '../../utils/dom.js';

const CHEVRON =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;

let openDropdown = null;

/**
 * Custom select control. `options` is a list of [value, label] pairs.
 * Returns the trigger button; its `value` property gets/sets the selection like a <select>.
 * The menu is rendered in <body> so it isn't clipped by scrolling containers.
 */
export function createDropdown({ options, value, onChange, className = '', title }) {
  let current = value ?? options[0]?.[0];
  let menu = null;
  let highlighted = -1;

  const label = h('span', { class: 'dropdown-label' });
  const button = h(
    'button',
    { type: 'button', class: `dropdown ${className}`.trim(), title, 'aria-haspopup': 'listbox' },
    label,
    h('span', { class: 'dropdown-chevron', html: CHEVRON }),
  );

  const indexOf = (v) => options.findIndex(([optionValue]) => optionValue === v);
  const renderLabel = () => {
    label.textContent = options[indexOf(current)]?.[1] ?? '';
  };

  function select(index) {
    const next = options[index][0];
    close();
    button.focus();
    if (next === current) return;
    current = next;
    renderLabel();
    onChange?.(next);
  }

  function highlight(index, scroll = false) {
    if (!menu) return;
    const items = menu.children;
    items[highlighted]?.classList.remove('highlighted');
    highlighted = Math.max(0, Math.min(options.length - 1, index));
    items[highlighted]?.classList.add('highlighted');
    if (scroll) items[highlighted]?.scrollIntoView({ block: 'nearest' });
  }

  function position() {
    const rect = button.getBoundingClientRect();
    menu.style.minWidth = `${rect.width}px`;
    menu.style.maxHeight = '';
    const { offsetHeight: height, offsetWidth: width } = menu;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;

    let top = rect.bottom + MENU_GAP;
    if (height > spaceBelow && spaceAbove > spaceBelow) {
      top = Math.max(VIEWPORT_MARGIN, rect.top - MENU_GAP - Math.min(height, spaceAbove));
      menu.style.maxHeight = `${spaceAbove}px`;
    } else {
      menu.style.maxHeight = `${spaceBelow}px`;
    }
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN));
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  const onOutsidePointer = (e) => {
    if (!button.contains(e.target) && !menu?.contains(e.target)) close();
  };
  const onScroll = (e) => {
    if (!menu?.contains(e.target)) close();
  };

  function open() {
    openDropdown?.close();
    menu = h(
      'div',
      { class: 'dropdown-menu', role: 'listbox' },
      options.map(([optionValue, optionLabel], index) =>
        h(
          'div',
          {
            class: `dropdown-option${optionValue === current ? ' selected' : ''}`,
            role: 'option',
            onPointerDown: (e) => e.preventDefault(),
            onPointerEnter: () => highlight(index),
            onClick: () => select(index),
          },
          h('span', { class: 'dropdown-check', html: optionValue === current ? CHECK : '' }),
          optionLabel,
        ),
      ),
    );
    document.body.append(menu);
    position();
    highlight(Math.max(0, indexOf(current)), true);
    button.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutsidePointer, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    openDropdown = { close };
  }

  function close() {
    if (!menu) return;
    menu.remove();
    menu = null;
    highlighted = -1;
    button.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutsidePointer, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', close);
    if (openDropdown?.close === close) openDropdown = null;
  }

  button.addEventListener('click', () => (menu ? close() : open()));
  button.addEventListener('keydown', (e) => {
    let handled = true;
    if (!menu) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) open();
      else handled = false;
    } else if (e.key === 'ArrowDown') highlight(highlighted + 1, true);
    else if (e.key === 'ArrowUp') highlight(highlighted - 1, true);
    else if (e.key === 'Home') highlight(0, true);
    else if (e.key === 'End') highlight(options.length - 1, true);
    else if (e.key === 'Enter' || e.key === ' ') select(highlighted);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') {
      close();
      handled = false;
    } else handled = false;

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  Object.defineProperty(button, 'value', {
    get: () => current,
    set: (v) => {
      current = v;
      renderLabel();
    },
  });
  renderLabel();
  return button;
}
