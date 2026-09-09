import * as THREE from 'three';
import type { GameContext } from '../Types/game.ts';
import type { Ground } from '../Types/terrain.ts';
import { GAME_CONFIG } from '../Config/game.ts';
import { ratioHeight } from './scale.ts';
import { changeAnimation } from './animation.ts';
import { sound } from './audio.ts';
const UP = new THREE.Vector3(0, 1, 0);

export function updatePlayerVisuals(
  ctx: GameContext,
  dt: number,
  traveled: number,
  move: THREE.Vector3,
  delta: THREE.Vector3,
  ground: Ground | null,
) {
  const h = ratioHeight(ctx.ratio);
  const up = ctx.gravity.up;
  if (delta.lengthSq() > 0.000001) {
    ctx.targetFacing = Math.atan2(move.x, move.z);
  }
  const diff =
    THREE.MathUtils.euclideanModulo(
      ctx.targetFacing - ctx.currentFacing + Math.PI,
      2 * Math.PI,
    ) - Math.PI;
  ctx.currentFacing += diff * Math.min(1, dt * 14);
  ctx.player.quaternion
    .copy(ctx.gravity.orientation)
    .multiply(new THREE.Quaternion().setFromAxisAngle(UP, ctx.currentFacing));
  ctx.player.position.copy(ctx.position);
  ctx.player.position.addScaledVector(up, 0.025 * h);
  ctx.player.visible =
    ctx.invulnerable <= 0 || Math.floor(ctx.invulnerable * 10) % 2 === 0;
  const moving = traveled > dt * h * 0.1;
  changeAnimation(ctx, !ctx.grounded ? 'Jump' : moving ? 'Run' : 'Idle');
  // Blend from the current pose and keep each clip's phase. Repeated taps
  // should not restart a stride or interrupt an unfinished crossfade.
  for (const [name, action] of Object.entries(ctx.actions)) {
    action.setEffectiveWeight(
      THREE.MathUtils.damp(
        action.getEffectiveWeight(),
        name === ctx.action ? 1 : 0,
        16,
        dt,
      ),
    );
  }
  if (ctx.actions.Run) {
    const pace = THREE.MathUtils.clamp(
      traveled / Math.max(dt * h * GAME_CONFIG.runSpeed, 0.0001),
      0,
      1,
    );
    const cadence = ctx.dashTime > 0 ? 1.75 : 0.85 + pace * 0.35;
    ctx.actions.Run.timeScale = THREE.MathUtils.damp(
      ctx.actions.Run.timeScale,
      cadence,
      10,
      dt,
    );
  }
  if (ctx.avatar) {
    const bank =
      moving && ctx.grounded
        ? -THREE.MathUtils.clamp(diff * 0.1, -0.09, 0.09)
        : 0;
    ctx.avatar.rotation.z = THREE.MathUtils.damp(
      ctx.avatar.rotation.z,
      bank,
      9,
      dt,
    );
  }
  const previousRunTime = ctx.actions.Run?.time ?? 0;
  ctx.mixer?.update(dt);
  if (ground) {
    ctx.shadow.visible = true;
    ctx.shadow.position
      .copy(ground.point)
      .addScaledVector(ground.normal, 0.018 * h);
    ctx.shadow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      ground.normal,
    );
    ctx.shadow.scale.setScalar(h * 0.4);
    ctx.reticle.position
      .copy(ground.point)
      .addScaledVector(ground.normal, 0.028 * h);
    ctx.reticle.quaternion.copy(ctx.shadow.quaternion);
    ctx.reticle.scale.setScalar(h * (ctx.dashTime > 0 ? 1.4 : 1));
    ctx.reticle.visible = true;
  } else {
    ctx.shadow.visible = false;
    ctx.reticle.visible = false;
  }
  if (moving && ctx.grounded && ctx.actions.Run) {
    const run = ctx.actions.Run;
    const halfStride = run.getClip().duration / 2;
    const contact = (time: number) =>
      Math.floor(
        THREE.MathUtils.euclideanModulo(time - halfStride / 6, halfStride * 2) /
          halfStride,
      );
    if (contact(run.time) !== contact(previousRunTime)) {
      sound(ctx, 100 + Math.random() * 45, 0.025, 'triangle', 0.016, 70);
    }
  }
}
