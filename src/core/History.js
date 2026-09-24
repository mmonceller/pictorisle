export class History {
  constructor(app, limit = 50) {
    this.app = app;
    this.limit = limit;
    this.entries = [];
    this.index = -1;
  }

  get canUndo() {
    return this.index > 0;
  }

  get canRedo() {
    return this.index < this.entries.length - 1;
  }

  reset(label) {
    this.entries = [{ label, state: this.app.doc.snapshot() }];
    this.index = 0;
    this.app.bus.emit('history:changed');
  }

  push(label) {
    this.entries.splice(this.index + 1);
    this.entries.push({ label, state: this.app.doc.snapshot() });
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
    this.app.bus.emit('history:changed');
  }

  undo() {
    if (this.canUndo) this.goTo(this.index - 1);
  }

  redo() {
    if (this.canRedo) this.goTo(this.index + 1);
  }

  goTo(index) {
    if (index < 0 || index >= this.entries.length || index === this.index) return;
    this.app.activeTool?.cancel();
    this.index = index;
    this.app.doc.restore(this.entries[index].state);
    this.app.onDocumentRestored();
    this.app.bus.emit('history:changed');
  }
}
