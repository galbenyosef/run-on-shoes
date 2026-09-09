import type { GameContext } from '../Types/game.ts';
import { GAME_CONFIG } from '../Config/game.ts';
import { ratioHeight } from './scale.ts';
import { resetGravity } from './gravity.ts';
import { findSpawn } from './terrain.ts';
import { resize } from './camera.ts';
import { notify } from './snapshot.ts';
import { changeAnimation } from './animation.ts';
import { ensureAudio } from './audio.ts';
import { clearHazards } from './particles.ts';
export function setRatio(ctx: GameContext, value: number) {
  const old = ratioHeight(ctx.ratio),
    h = ratioHeight(value);
  ctx.ratio = value;
  ctx.avatar?.scale.setScalar(h / GAME_CONFIG.avatarHeight);
  ctx.shadow.scale.setScalar(h * 0.43);
  ctx.reticle.scale.setScalar(h * 1.2);
  ctx.velocity.multiplyScalar(h / old);
  clearHazards(ctx);
  ctx.nextHazard = Math.max(ctx.nextHazard, ctx.state.time + 1.8);
  notify(ctx);
}

export function start(ctx: GameContext) {
  if (!ctx.state.ready || !ctx.terrain) return;
  ensureAudio(ctx);
  clearHazards(ctx);
  resetGravity(ctx.gravity);
  ctx.camera.up.copy(ctx.gravity.up);
  ctx.stage.quaternion.identity();
  ctx.spawnPoint.copy(findSpawn(ctx.terrain).point);
  ctx.state = {
    mode: 'playing',
    time: 0,
    health: GAME_CONFIG.health,
    dodged: 0,
    wave: 1,
    distance: 0,
    dash: 1,
    message: '先熟悉鞋面：WASD 移动，空格跳跃',
    ready: true,
  };
  ctx.position.copy(ctx.spawnPoint);
  ctx.player.position.copy(ctx.position);
  ctx.player.visible = true;
  ctx.shadow.visible = true;
  ctx.reticle.visible = true;
  ctx.grounded = true;
  ctx.velocity.set(0, 0, 0);
  ctx.keys.clear();
  ctx.nextHazard = 3.5;
  ctx.dashTime = 0;
  ctx.dashCooldown = 0;
  ctx.invulnerable = 2;
  ctx.transition = 1.8;
  ctx.controls.enabled = false;
  ctx.orbitalYaw = 0.45;
  ctx.orbitalPitch = 0.38;
  ctx.currentFacing = Math.PI;
  ctx.targetFacing = Math.PI;
  changeAnimation(ctx, 'Idle');
  setRatio(ctx, ctx.ratio);
  resize(ctx);
  notify(ctx);
}

export function overview(ctx: GameContext) {
  clearHazards(ctx);
  ctx.keys.clear();
  ctx.state.mode = 'overview';
  ctx.state.message = '';
  resetGravity(ctx.gravity);
  ctx.camera.up.copy(ctx.gravity.up);
  ctx.stage.quaternion.identity();
  ctx.player.visible = false;
  ctx.shadow.visible = false;
  ctx.reticle.visible = false;
  ctx.controls.enabled = true;
  ctx.controls.autoRotate = true;
  ctx.controls.target.set(0, 22, 0);
  ctx.camera.position.set(105, 74, 125);
  ctx.controls.update();
  resize(ctx);
  notify(ctx);
}

export function togglePause(ctx: GameContext) {
  if (!['playing', 'paused'].includes(ctx.state.mode)) return;
  ctx.state.mode = ctx.state.mode === 'playing' ? 'paused' : 'playing';
  ctx.keys.clear();
  ctx.pointer = undefined;
  notify(ctx);
}
