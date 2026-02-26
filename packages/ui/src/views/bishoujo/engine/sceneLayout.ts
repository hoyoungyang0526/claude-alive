import { SLOTS, MAX_SLOTS, type SlotDef, MODEL_NAMES, type ModelName } from './constants.ts';

export interface CharacterSlot {
  slotIndex: number;
  def: SlotDef;
  modelName: ModelName;
}

/**
 * Given the number of agents, return a subset of slots that produces
 * a balanced layout. Agents fill front→back, center→sides.
 */
const LAYOUT_PRIORITY: number[][] = [
  [7],                               // 1 agent: front-right-center
  [6, 7],                            // 2: front row
  [4, 6, 7],                         // 3
  [3, 4, 6, 7],                      // 4
  [3, 4, 5, 6, 7],                   // 5
  [0, 2, 3, 4, 5, 6],               // 6
  [0, 1, 2, 3, 4, 6, 7],            // 7
  [0, 1, 2, 3, 4, 5, 6, 7],         // 8
];

/**
 * Scale multiplier when few agents are present — makes them more prominent.
 */
function getScaleBoost(agentCount: number): number {
  if (agentCount === 1) return 2.0;
  if (agentCount === 2) return 1.6;
  if (agentCount === 3) return 1.3;
  return 1.0;
}

/**
 * Assign slots + model names for a set of agents.
 * Returns a Map<sessionId, CharacterSlot>.
 */
export function assignSlots(sessionIds: string[]): Map<string, CharacterSlot> {
  const count = Math.min(sessionIds.length, MAX_SLOTS);
  const result = new Map<string, CharacterSlot>();
  if (count === 0) return result;

  const priority = LAYOUT_PRIORITY[count - 1] ?? LAYOUT_PRIORITY[LAYOUT_PRIORITY.length - 1]!;
  const boost = getScaleBoost(count);

  for (let i = 0; i < count; i++) {
    const slotIndex = priority[i]!;
    const base = SLOTS[slotIndex]!;
    result.set(sessionIds[i]!, {
      slotIndex,
      def: { ...base, scale: base.scale * boost },
      modelName: MODEL_NAMES[i % MODEL_NAMES.length]!,
    });
  }

  return result;
}

/**
 * Resolve a SlotDef into pixel coordinates given canvas dimensions.
 */
export function slotToPixel(
  def: SlotDef,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  return {
    x: def.x * canvasWidth,
    y: def.y * canvasHeight,
  };
}
