import { GAME_CONFIG } from '../Config/game.ts';
import { ratioHeight } from './scale.ts';
export function jumpVelocity(ratio: number) {
  return GAME_CONFIG.jumpSpeed * ratioHeight(ratio);
}
