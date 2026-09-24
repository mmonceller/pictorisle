import { fileCommands } from './fileCommands.js';
import { editCommands } from './editCommands.js';
import { imageCommands } from './imageCommands.js';
import { layerCommands } from './layerCommands.js';
import { selectCommands } from './selectCommands.js';
import { viewCommands } from './viewCommands.js';
import { toolCommands } from './toolCommands.js';
import { filterCommands } from './filterCommands.js';

// Commands that don't touch pixels, so an in-progress tool edit can stay open.
const PASSIVE = new Set([
  'undo',
  'redo',
  'zoomIn',
  'zoomOut',
  'fitToScreen',
  'actualSize',
  'swapColors',
  'resetColors',
  'brushSmaller',
  'brushLarger',
  'freeTransform',
]);

export function createCommands(app) {
  const registry = {
    ...fileCommands(app),
    ...editCommands(app),
    ...imageCommands(app),
    ...layerCommands(app),
    ...selectCommands(app),
    ...viewCommands(app),
    ...toolCommands(app),
    ...filterCommands(app),
  };

  return {
    has: (name) => name in registry,
    run(name, ...args) {
      const command = registry[name];
      if (!command) {
        console.warn(`Unknown command: ${name}`);
        return undefined;
      }
      if (!PASSIVE.has(name)) app.activeTool.commitPending();
      return command(...args);
    },
  };
}
