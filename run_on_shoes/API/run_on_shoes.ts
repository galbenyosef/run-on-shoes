import { GameSnapshot } from '../Module/snapshot.ts';
import { GAME_CONFIG } from '../Config/game.ts';
import type { GameOptions, Snapshot } from '../Types/game.ts';

export type { GameController, GameOptions, Snapshot } from '../Types/game.ts';
export const DEFAULT_RATIO = 100;
export const SCALE_LIMITS = Object.freeze({
  min: GAME_CONFIG.minRatio,
  max: GAME_CONFIG.maxRatio,
  step: GAME_CONFIG.ratioStep,
});

export async function createGame(
  host: HTMLElement,
  emit: (snapshot: Snapshot) => void,
  options: Partial<GameOptions> = {},
) {
  const { RunOnShoes } = await import('../Module/run_on_shoes.ts');
  return RunOnShoes.createGame(host, emit, {
    ratio: DEFAULT_RATIO,
    baseUrl: import.meta.env?.BASE_URL ?? './',
    ...options,
  });
}

export function initialSnapshot() {
  return GameSnapshot.initialSnapshot();
}
