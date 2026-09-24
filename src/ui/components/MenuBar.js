import { h } from '../../utils/dom.js';
import { MENUS } from '../menuConfig.js';
import { shortcutLabel } from '../../app/shortcuts.js';

export class MenuBar {
  constructor(app, el) {
    this.app = app;
    this.el = el;
    this.openIndex = -1;

    el.append(h('div', { class: 'brand' }, 'PixelForge'));
    this.menus = MENUS.map((menu, index) => {
      const button = h(
        'button',
        {
          class: 'menu-button',
          onPointerDown: (e) => {
            e.stopPropagation();
            this.toggle(index);
          },
          onPointerEnter: () => {
            if (this.openIndex !== -1 && this.openIndex !== index) this.open(index);
          },
        },
        menu.label,
      );
      const dropdown = h('div', { class: 'menu-dropdown' });
      const wrap = h('div', { class: 'menu' }, button, dropdown);
      el.append(wrap);
      return { menu, wrap, dropdown };
    });

    document.addEventListener('pointerdown', (e) => {
      if (!this.el.contains(e.target)) this.close();
    });
  }

  toggle(index) {
    if (this.openIndex === index) this.close();
    else this.open(index);
  }

  open(index) {
    this.close();
    const { menu, wrap, dropdown } = this.menus[index];
    dropdown.replaceChildren(...menu.items.map((item) => this.renderItem(item)));
    wrap.classList.add('open');
    this.openIndex = index;
  }

  close() {
    if (this.openIndex === -1) return;
    this.menus[this.openIndex].wrap.classList.remove('open');
    this.openIndex = -1;
  }

  renderItem(item) {
    if (item.separator) return h('div', { class: 'menu-separator' });
    if (item.header) return h('div', { class: 'menu-header' }, item.header);
    const enabled = item.enabled ? item.enabled(this.app) : true;
    return h(
      'button',
      {
        class: 'menu-item',
        disabled: !enabled,
        onClick: () => {
          this.close();
          this.app.commands.run(item.command);
        },
      },
      h('span', {}, item.label),
      h('span', { class: 'menu-shortcut' }, shortcutLabel(item.command)),
    );
  }
}
