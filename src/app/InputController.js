import { handleShortcut } from './shortcuts.js';
import { isTypingTarget } from '../utils/dom.js';
import { loadImage, stripExtension } from '../utils/file.js';
import { placeImageAsLayer } from '../commands/helpers.js';

/** Routes pointer, wheel, keyboard, paste and drop events to the viewport, tools and commands. */
export class InputController {
  constructor(app) {
    this.app = app;
    this.viewport = app.viewport;
    this.canvas = app.viewport.canvas;
    this.activePointer = null;
    this.pan = null;
    this.spaceDown = false;

    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    c.addEventListener('pointermove', (e) => this.onPointerMove(e));
    c.addEventListener('pointerup', (e) => this.onPointerUp(e));
    c.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    c.addEventListener('pointerleave', () => {
      if (this.activePointer !== null) return;
      app.pointer = null;
      this.viewport.requestRender(false);
    });
    c.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.setSpace(false);
    });
    window.addEventListener('blur', () => this.setSpace(false));
    window.addEventListener('paste', (e) => this.onPaste(e));

    app.workspace.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    });
    app.workspace.addEventListener('drop', (e) => this.onDrop(e));
  }

  position(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.viewport.screenToDoc(sx, sy);
    return { x, y, sx, sy };
  }

  updateCursor() {
    this.canvas.style.cursor = this.pan ? 'grabbing' : this.spaceDown ? 'grab' : this.app.activeTool.cursor;
  }

  setSpace(down) {
    if (this.spaceDown === down) return;
    this.spaceDown = down;
    this.updateCursor();
  }

  // ---- Pointer ------------------------------------------------------------------------

  onPointerDown(e) {
    if (this.activePointer !== null || !this.app.doc) return;
    const panning = e.button === 1 || (e.button === 0 && this.spaceDown);
    if (!panning && e.button !== 0) return;
    e.preventDefault();
    document.activeElement?.blur?.();
    this.canvas.setPointerCapture(e.pointerId);
    this.activePointer = e.pointerId;
    if (panning) {
      this.pan = { x: e.clientX, y: e.clientY };
      this.updateCursor();
      return;
    }
    this.app.activeTool.onPointerDown(e, this.position(e));
  }

  onPointerMove(e) {
    const pos = this.position(e);
    this.app.pointer = pos;
    this.app.bus.emit('pointer:moved', pos);

    if (this.pan) {
      this.viewport.panBy(e.clientX - this.pan.x, e.clientY - this.pan.y);
      this.pan = { x: e.clientX, y: e.clientY };
      return;
    }

    const tool = this.app.activeTool;
    const isDown = e.pointerId === this.activePointer;
    if (isDown && tool.wantsCoalesced && e.getCoalescedEvents) {
      const events = e.getCoalescedEvents();
      for (const ev of events.length ? events : [e]) tool.onPointerMove(ev, this.position(ev), true);
    } else {
      tool.onPointerMove(e, pos, isDown);
    }
    this.viewport.requestRender(false);
  }

  onPointerUp(e) {
    if (e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (this.pan) {
      this.pan = null;
      this.updateCursor();
      return;
    }
    this.app.activeTool.onPointerUp(e, this.position(e));
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002));
      this.viewport.zoomBy(factor, e.clientX - rect.left, e.clientY - rect.top);
    } else if (e.shiftKey && !e.deltaX) {
      this.viewport.panBy(-e.deltaY, 0);
    } else {
      this.viewport.panBy(-e.deltaX, -e.deltaY);
    }
  }

  // ---- Keyboard -----------------------------------------------------------------------

  onKeyDown(e) {
    if (isTypingTarget(e.target) || document.querySelector('.modal-backdrop')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      this.setSpace(true);
      return;
    }
    if (this.app.activeTool.onKeyDown(e) || handleShortcut(this.app, e)) e.preventDefault();
  }

  // ---- Clipboard & drag-drop ----------------------------------------------------------

  async onPaste(e) {
    if (isTypingTarget(e.target) || !this.app.doc) return;
    e.preventDefault();
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (!item) {
      this.app.commands.run('paste');
      return;
    }
    const image = await loadImage(item.getAsFile());
    const clip = this.app.clipboard;
    // Our own copies are mirrored to the system clipboard; paste those in place.
    if (clip && clip.canvas.width === image.naturalWidth && clip.canvas.height === image.naturalHeight) {
      this.app.commands.run('paste');
    } else {
      placeImageAsLayer(this.app, image, 'Pasted Image');
    }
  }

  async onDrop(e) {
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    for (const file of files) {
      try {
        placeImageAsLayer(this.app, await loadImage(file), stripExtension(file.name));
      } catch {
        this.app.toast(`Could not open ${file.name}`);
      }
    }
  }
}
