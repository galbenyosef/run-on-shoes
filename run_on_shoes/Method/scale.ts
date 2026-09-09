import { GAME_CONFIG } from '../Config/game.ts';
export function ratioHeight(ratio: number) {
  if (
    !Number.isFinite(ratio) ||
    ratio < GAME_CONFIG.minRatio ||
    ratio > GAME_CONFIG.maxRatio
  )
    throw new RangeError('Scale must be 20 to 200');
  return GAME_CONFIG.shoeLength / ratio;
}
