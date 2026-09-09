import type { GameContext } from '../Types/game.ts';
import type { Snapshot } from '../Types/game.ts';
import { GAME_CONFIG } from '../Config/game.ts';

export function initialSnapshot(): Snapshot {
  return {
    mode: 'loading',
    time: 0,
    health: GAME_CONFIG.health,
    dodged: 0,
    wave: 1,
    distance: 0,
    dash: 1,
    message: '正在载入鞋子的三维模型',
    ready: false,
  };
}
export function notify(ctx: GameContext) {
  ctx.emit({ ...ctx.state });
}
