import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';

export class Toolbar {
  constructor(app, el) {
    this.app = app;
    this.buttons = new Map();
    for (const tool of app.tools.values()) {
      const button = h(
        'button',
        {
          class: 'tool-button',
          title: `${tool.label} (${tool.shortcut.toUpperCase()})`,
          onClick: () => app.setTool(tool.id),
        },
        icon(tool.icon, 20),
      );
      this.buttons.set(tool.id, button);
      el.append(button);
    }
    app.bus.on('tool:changed', (active) => {
      this.buttons.forEach((button, id) => button.classList.toggle('active', id === active.id));
    });
    app.bus.on('document:changed', () => this.updateAvailability());
    app.bus.on('selection:changed', () => this.updateAvailability());
  }

  updateAvailability() {
    for (const [id, button] of this.buttons) button.hidden = !this.app.tools.get(id).isAvailable();
  }
}
