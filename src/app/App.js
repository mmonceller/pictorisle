import { EventBus } from '../core/EventBus.js';
import { Document } from '../core/Document.js';
import { History } from '../core/History.js';
import { Viewport } from '../render/Viewport.js';
import { createTools } from '../tools/index.js';
import { createCommands } from '../commands/index.js';
import { initUI } from '../ui/index.js';
import { toast } from '../ui/toast.js';
import { InputController } from './InputController.js';

const DEFAULT_COLORS = { primary: '#000000', secondary: '#ffffff' };

/**
 * Central application state. Events emitted on `bus`:
 * document:changed, history:changed, tool:changed, tool:options,
 * colors:changed, view:changed, selection:changed, pointer:moved
 */
export class App {
  constructor(root) {
    this.bus = new EventBus();
    this.doc = null;
    this.docName = 'Untitled';
    this.preview = null;
    this.pointer = null;
    this.clipboard = null;
    this.colors = { ...DEFAULT_COLORS };
    this.workspace = root.querySelector('#workspace');

    this.history = new History(this);
    this.viewport = new Viewport(this, root.querySelector('#viewport'));
    this.tools = createTools(this);
    this.activeTool = null;
    this.commands = createCommands(this);
    initUI(this, root);
    this.input = new InputController(this);
    this.bus.on('document:changed', () => {
      if (this.activeTool && !this.activeTool.isAvailable()) this.setTool('move');
    });

    this.setTool('brush');
    this.newDocument(1280, 800, '#ffffff');
  }

  // ---- Documents ----------------------------------------------------------------------

  newDocument(width, height, background) {
    this.loadDocument(new Document(width, height, background), 'New Document');
  }

  loadDocument(doc, label, name = 'Untitled') {
    this.activeTool?.cancel();
    this.doc = doc;
    this.docName = name;
    this.preview = null;
    this.history.reset(label);
    this.viewport.fit();
    this.notifyChanged();
  }

  /**
   * Records a history step. `dirty` lists layers whose pixels changed
   * (defaults to the active layer; 'all' for whole-document operations).
   */
  commit(label, dirty = [this.doc.activeLayer]) {
    const layers = dirty === 'all' ? this.doc.layers : dirty;
    layers.forEach((layer) => layer?.touch());
    this.history.push(label);
    this.notifyChanged();
  }

  notifyChanged() {
    this.bus.emit('document:changed');
    this.requestRender();
  }

  onDocumentRestored() {
    this.preview = null;
    this.notifyChanged();
  }

  // ---- Rendering ----------------------------------------------------------------------

  /** Temporarily display `canvas` in place of `layer` (used for live tool/filter previews). */
  setPreview(layer, canvas) {
    this.preview = layer ? { layer, canvas } : null;
    this.requestRender();
  }

  getLayerSource(layer) {
    return this.preview?.layer === layer ? this.preview.canvas : layer.canvas;
  }

  requestRender() {
    this.viewport.requestRender(true);
  }

  // ---- Tools & colors -----------------------------------------------------------------

  setTool(id) {
    const tool = this.tools.get(id);
    if (!tool || tool === this.activeTool) return;
    if (!tool.isAvailable()) {
      if (tool.id === 'transform') this.toast('Select an image layer to transform it');
      return;
    }
    this.activeTool?.deactivate();
    this.activeTool = tool;
    tool.activate();
    this.input.updateCursor();
    this.bus.emit('tool:changed', tool);
    this.viewport.requestRender(false);
  }

  setColor(which, hex) {
    this.colors[which] = hex;
    this.bus.emit('colors:changed', this.colors);
  }

  swapColors() {
    const { primary, secondary } = this.colors;
    this.colors = { primary: secondary, secondary: primary };
    this.bus.emit('colors:changed', this.colors);
  }

  resetColors() {
    this.colors = { ...DEFAULT_COLORS };
    this.bus.emit('colors:changed', this.colors);
  }

  toast(message) {
    toast(message);
  }
}
