import { h } from '../../utils/dom.js';

export class HistoryPanel {
  constructor(app, el) {
    this.app = app;
    this.list = h('div', { class: 'history-list' });
    el.append(h('div', { class: 'panel-header' }, 'History'), this.list);
    app.bus.on('history:changed', () => this.render());
  }

  render() {
    const { entries, index } = this.app.history;
    this.list.replaceChildren(
      ...entries.map((entry, i) =>
        h(
          'div',
          {
            class: `history-item${i === index ? ' active' : ''}${i > index ? ' future' : ''}`,
            onClick: () => this.app.history.goTo(i),
          },
          entry.label,
        ),
      ),
    );
    this.list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }
}
