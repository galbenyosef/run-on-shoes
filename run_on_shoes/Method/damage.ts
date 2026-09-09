import type { GameContext } from '../Types/game.ts';
import { notify } from './snapshot.ts';
import { sound } from './audio.ts';
export function damage(ctx: GameContext, reason: string) {
  if (ctx.invulnerable > 0 || ctx.state.mode !== 'playing') return;
  ctx.state.health--;
  ctx.invulnerable = 1.65;
  ctx.shake = 0.7;
  ctx.state.message = reason + ' · 短暂无敌';
  sound(ctx, 100, 0.3, 'sawtooth', 0.035, 40);
  if (ctx.state.health <= 0) {
    ctx.state.mode = 'gameover';
    ctx.keys.clear();
    ctx.player.visible = true;
  }
  notify(ctx);
}
