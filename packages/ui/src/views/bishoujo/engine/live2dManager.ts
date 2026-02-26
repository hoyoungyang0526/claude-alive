import * as PIXI from 'pixi.js';
import { Live2DModel } from '@naari3/pixi-live2d-display';
import type { ModelName } from './constants.ts';
import { modelPath } from './constants.ts';

// pixi-live2d-display needs window.PIXI for Ticker auto-update
(window as any).PIXI = PIXI;

/**
 * Load a Live2D model. Each call creates a fresh instance
 * (each character needs its own parameters).
 */
export async function loadModel(name: ModelName): Promise<Live2DModel> {
  const model = await Live2DModel.from(modelPath(name), {
    autoHitTest: false,
    autoFocus: false,
    autoUpdate: true,
  });
  return model;
}

/**
 * Apply a Live2D parameter by name with smooth blending.
 * Safe to call even if the parameter doesn't exist on this model.
 */
export function setParam(model: Live2DModel, name: string, value: number): void {
  const coreModel = (model as any).internalModel?.coreModel;
  if (!coreModel) return;
  const idx = coreModel.getParameterIndex?.(name);
  if (idx != null && idx >= 0) {
    coreModel.setParameterValueById?.(name, value);
  }
}

/**
 * Convenience: set multiple params at once.
 */
export function setParams(model: Live2DModel, params: Record<string, number>): void {
  for (const [name, value] of Object.entries(params)) {
    setParam(model, name, value);
  }
}
