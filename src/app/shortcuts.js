/**
 * Key combos (modifier order: ctrl, alt, shift) mapped to command names.
 * The first combo listed for a command is the one shown in menus.
 * Ctrl+N / Ctrl+Shift+N are reserved by browsers, hence the Alt variants.
 */
export const SHORTCUTS = {
  'alt+n': 'newDocument',
  'ctrl+o': 'open',
  'ctrl+s': 'exportPng',
  'ctrl+shift+s': 'exportJpeg',
  'ctrl+z': 'undo',
  'ctrl+shift+z': 'redo',
  'ctrl+y': 'redo',
  'ctrl+x': 'cut',
  'ctrl+c': 'copy',
  delete: 'clearSelection',
  backspace: 'clearSelection',
  'alt+backspace': 'fillPrimary',
  'ctrl+backspace': 'fillSecondary',
  'ctrl+a': 'selectAll',
  'ctrl+d': 'deselect',
  'alt+shift+n': 'newLayer',
  'ctrl+j': 'duplicateLayer',
  'ctrl+]': 'moveLayerUp',
  'ctrl+[': 'moveLayerDown',
  'ctrl+alt+t': 'freeTransform',
  'ctrl+e': 'mergeDown',
  'ctrl+shift+e': 'flatten',
  'ctrl+alt+i': 'imageSize',
  'ctrl+alt+c': 'canvasSize',
  'ctrl+i': 'filter.invert',
  'ctrl+shift+u': 'filter.grayscale',
  'ctrl+=': 'zoomIn',
  'ctrl+shift+=': 'zoomIn',
  'ctrl+-': 'zoomOut',
  'ctrl+0': 'fitToScreen',
  'ctrl+1': 'actualSize',
  x: 'swapColors',
  d: 'resetColors',
  '[': 'brushSmaller',
  ']': 'brushLarger',
};

const comboByCommand = {};
for (const [combo, command] of Object.entries(SHORTCUTS)) comboByCommand[command] ??= combo;

export function comboFromEvent(e) {
  let key = e.key.toLowerCase();
  if (e.code.startsWith('Key')) key = e.code.slice(3).toLowerCase();
  else if (e.code.startsWith('Digit')) key = e.code.slice(5);
  else if (key === '+') key = '=';
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(key);
  return parts.join('+');
}

export function shortcutLabel(command) {
  const combo = comboByCommand[command];
  if (!combo) return '';
  return combo
    .split('+')
    .map((part) => (part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join('+');
}

export function handleShortcut(app, e) {
  const combo = comboFromEvent(e);
  const command = SHORTCUTS[combo];
  if (command) {
    app.commands.run(command);
    return true;
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    const tool = [...app.tools.values()].find((t) => t.shortcut === combo);
    if (tool) {
      app.setTool(tool.id);
      return true;
    }
  }
  return false;
}
