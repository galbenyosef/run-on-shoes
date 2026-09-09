import type { GameContext } from '../Types/game.ts';
import { disposeObject } from './resources.ts';

/** Dispose is safe after successful startup, load failure, or a previous dispose. */
export function disposeGame(ctx: GameContext) {
  if (ctx.disposed) return;
  ctx.disposed = true;
  cancelAnimationFrame(ctx.raf);
  ctx.cleanupInput();
  ctx.webAbort.abort();
  ctx.controls.dispose();
  ctx.mixer?.stopAllAction();
  if (ctx.avatar) ctx.mixer?.uncacheRoot(ctx.avatar);
  void ctx.audio?.close().catch(() => {});
  disposeObject(ctx.scene);
  ctx.terrain?.meshes.splice(0);
  ctx.hazards.length = 0;
  ctx.particles.length = 0;
  ctx.keys.clear();
  ctx.renderer.dispose();
  ctx.renderer.domElement.remove();
}
