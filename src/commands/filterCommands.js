import { FILTERS } from '../filters/index.js';
import { runFilter } from '../filters/runFilter.js';

export function filterCommands(app) {
  return Object.fromEntries(FILTERS.map((filter) => [`filter.${filter.id}`, () => runFilter(app, filter)]));
}
