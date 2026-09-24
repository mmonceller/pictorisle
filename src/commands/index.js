import { fileCommands } from './fileCommands.js';
import { editCommands } from './editCommands.js';
import { imageCommands } from './imageCommands.js';
import { layerCommands } from './layerCommands.js';
import { selectCommands } from './selectCommands.js';
import { viewCommands } from './viewCommands.js';
import { toolCommands } from './toolCommands.js';
import { filterCommands } from './filterCommands.js';

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
      return command(...args);
    },
  };
}
