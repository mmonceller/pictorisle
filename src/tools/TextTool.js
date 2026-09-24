import { Tool } from './Tool.js';
import { h } from '../utils/dom.js';

const FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'];
const LINE_HEIGHT = 1.2;

export class TextTool extends Tool {
  static meta = { id: 'text', label: 'Type', icon: 'text', shortcut: 't' };

  constructor(app) {
    super(app);
    this.options = { font: 'Arial', size: 48, bold: false, italic: false };
    this.cursor = 'text';
    this.hint = 'Click to place text. Ctrl+Enter or click elsewhere to commit, Esc to cancel.';
    this.editor = null;
    app.bus.on('view:changed', () => this.styleEditor());
  }

  get schema() {
    return [
      { key: 'font', label: 'Font', type: 'select', options: FONTS.map((f) => [f, f]) },
      { key: 'size', label: 'Size', type: 'range', min: 6, max: 400, unit: 'px' },
      { key: 'bold', label: 'Bold', type: 'checkbox' },
      { key: 'italic', label: 'Italic', type: 'checkbox' },
    ];
  }

  fontString(size) {
    const { font, bold, italic } = this.options;
    return `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px "${font}"`;
  }

  onPointerDown(e, pos) {
    if (this.editor) {
      this.commit();
      return;
    }
    this.openEditor(pos);
  }

  openEditor(pos) {
    const textarea = h('textarea', { class: 'text-editor', spellcheck: 'false', rows: 1 });
    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.cancel();
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.commit();
    });
    textarea.addEventListener('input', () => this.autosize());
    this.app.workspace.append(textarea);
    this.editor = { textarea, pos };
    this.styleEditor();
    requestAnimationFrame(() => textarea.focus());
  }

  styleEditor() {
    if (!this.editor) return;
    const { textarea, pos } = this.editor;
    const vp = this.app.viewport;
    const screen = vp.docToScreen(pos.x, pos.y);
    Object.assign(textarea.style, {
      left: `${screen.x}px`,
      top: `${screen.y}px`,
      font: this.fontString(this.options.size * vp.zoom),
      lineHeight: String(LINE_HEIGHT),
      color: this.app.colors.primary,
    });
    this.autosize();
  }

  autosize() {
    const { textarea } = this.editor;
    textarea.style.width = '0px';
    textarea.style.height = '0px';
    textarea.style.width = `${textarea.scrollWidth + 4}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  onOptionsChange() {
    this.styleEditor();
  }

  commit() {
    if (!this.editor) return;
    const { textarea, pos } = this.editor;
    this.editor = null;
    textarea.remove();
    const text = textarea.value;
    if (!text.trim()) return;

    const { size } = this.options;
    const doc = this.doc;
    const layer = doc.createLayer(text.trim().replace(/\s+/g, ' ').slice(0, 28));
    const ctx = layer.ctx;
    ctx.font = this.fontString(size);
    ctx.fillStyle = this.app.colors.primary;
    ctx.textBaseline = 'top';
    // CSS line boxes add half the extra leading above the glyphs; match that offset.
    const leading = (size * (LINE_HEIGHT - 1)) / 2;
    text.split('\n').forEach((line, i) => ctx.fillText(line, pos.x, pos.y + leading + i * size * LINE_HEIGHT));
    doc.addLayer(layer);
    this.app.commit('Type Layer', [layer]);
  }

  cancel() {
    if (!this.editor) return;
    this.editor.textarea.remove();
    this.editor = null;
  }

  deactivate() {
    this.commit();
  }
}
