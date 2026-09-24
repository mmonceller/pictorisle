import { MenuBar } from './components/MenuBar.js';
import { OptionsBar } from './components/OptionsBar.js';
import { Toolbar } from './components/Toolbar.js';
import { StatusBar } from './components/StatusBar.js';
import { ColorPanel } from './panels/ColorPanel.js';
import { HistoryPanel } from './panels/HistoryPanel.js';
import { LayersPanel } from './panels/LayersPanel.js';

export function initUI(app, root) {
  const $ = (selector) => root.querySelector(selector);
  new MenuBar(app, $('#menubar'));
  new OptionsBar(app, $('#optionsbar'));
  new Toolbar(app, $('#toolbar'));
  new StatusBar(app, $('#statusbar'));
  new ColorPanel(app, $('#color-panel'));
  new HistoryPanel(app, $('#history-panel'));
  new LayersPanel(app, $('#layers-panel'));
}
