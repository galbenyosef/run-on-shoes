import type { GameContext } from '../Types/game.ts';
import { GAME_CONFIG } from '../Config/game.ts';
import { advanceGravity } from './gravity.ts';
import { notify } from './snapshot.ts';
import { movePlayer } from './movement.ts';
import { updateCamera } from './camera.ts';
import { spawnHazard, updateHazards } from './hazards.ts';
export function advanceFrame(ctx: GameContext, t: number) {
  if (ctx.disposed) return;
  const elapsed = ctx.last ? Math.min((t - ctx.last) / 1000, 0.07) : 0;
  ctx.last = t;
  const dt = Math.min(elapsed, GAME_CONFIG.maxFrameStep);
  if (ctx.state.mode === 'playing') {
    advanceGravity(ctx.gravity, dt);
    ctx.stage.quaternion.copy(ctx.gravity.orientation);
    ctx.state.time += dt;
    ctx.state.wave = 1 + Math.floor(ctx.state.time / GAME_CONFIG.waveSeconds);
    movePlayer(ctx, dt);
    if (ctx.state.mode === 'playing') {
      updateHazards(ctx, dt);
      if (ctx.state.time > ctx.nextHazard) {
        spawnHazard(ctx, Math.random() < 0.48 ? 'meteor' : 'laser');
        if (ctx.state.wave > 2 && Math.random() < 0.3)
          spawnHazard(ctx, 'laser');
        ctx.nextHazard =
          ctx.state.time + Math.max(0.5, 1.8 - ctx.state.wave * 0.15);
      }
      if (ctx.invulnerable <= 0)
        ctx.state.message = ctx.hazards.some(
          (a) => a.type === 'meteor' && a.age < a.delay,
        )
          ? '橙色区域：陨石将至 · 跳过冲击波'
          : ctx.hazards.some((a) => a.type === 'laser' && a.age < a.delay)
            ? '红色区域：激光锁定 · 立即离开'
            : ctx.state.time < 7
              ? 'WASD 移动 · 空格跳跃 · Shift 冲刺'
              : '重力正在缓慢转向 · 向新的朝上表面移动';
    }
    updateCamera(ctx, dt);
    ctx.tick += dt;
    if (ctx.tick > 0.09) {
      ctx.tick = 0;
      notify(ctx);
    }
  } else if (ctx.state.mode === 'overview' || ctx.state.mode === 'loading')
    ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  ctx.raf = requestAnimationFrame(ctx.onFrame);
}
