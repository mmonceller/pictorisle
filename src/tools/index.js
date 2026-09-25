import { MoveTool } from './MoveTool.js';
import { TransformTool } from './TransformTool.js';
import { MarqueeTool, EllipticalMarqueeTool } from './MarqueeTool.js';
import { LassoTool } from './LassoTool.js';
import { BrushTool } from './BrushTool.js';
import { EraserTool } from './EraserTool.js';
import { FillTool } from './FillTool.js';
import { GradientTool } from './GradientTool.js';
import { EyedropperTool } from './EyedropperTool.js';
import { TextTool } from './TextTool.js';
import { ShapeTool } from './ShapeTool.js';
import { HandTool } from './HandTool.js';
import { ZoomTool } from './ZoomTool.js';

const TOOL_CLASSES = [
  MoveTool,
  TransformTool,
  MarqueeTool,
  EllipticalMarqueeTool,
  LassoTool,
  BrushTool,
  EraserTool,
  FillTool,
  GradientTool,
  EyedropperTool,
  TextTool,
  ShapeTool,
  HandTool,
  ZoomTool,
];

export function createTools(app) {
  return new Map(
    TOOL_CLASSES.map((ToolClass) => {
      const tool = new ToolClass(app);
      return [tool.id, tool];
    }),
  );
}
