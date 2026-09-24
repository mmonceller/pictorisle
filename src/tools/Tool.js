/**
 * Base class for all tools. Subclasses declare `static meta` and override the hooks they need.
 * Pointer positions are { x, y } in document pixels plus { sx, sy } in viewport CSS pixels.
 */
export class Tool {
  static meta = { id: 'tool', label: 'Tool', icon: '', shortcut: '' };

  constructor(app) {
    this.app = app;
    Object.assign(this, this.constructor.meta);
    this.options = {};
    this.cursor = 'crosshair';
    this.hint = '';
    this.wantsCoalesced = false;
  }

  get doc() {
    return this.app.doc;
  }

  /** Field descriptors rendered by the options bar. */
  get schema() {
    return [];
  }

  /** Returns the active layer, or null (with a message) if it can't be edited. */
  editableLayer() {
    const layer = this.doc.activeLayer;
    if (!layer.visible) {
      this.app.toast('The active layer is hidden');
      return null;
    }
    return layer;
  }

  activate() {}
  deactivate() {
    this.cancel();
  }
  cancel() {}
  /** Called before commands run so in-progress edits are committed first. */
  commitPending() {}
  /** Discards in-progress edits; returns true if there were any (Undo uses this). */
  revertPending() {
    return false;
  }
  onPointerDown() {}
  onPointerMove() {}
  onPointerUp() {}
  onKeyDown() {
    return false;
  }
  onOptionsChange() {}
  drawOverlay() {}
}
