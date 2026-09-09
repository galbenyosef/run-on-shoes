import type { GameContext } from '../Types/game.ts';
export function changeAnimation(ctx: GameContext, name: string) {
  if (ctx.actions[name]) ctx.action = name;
}
