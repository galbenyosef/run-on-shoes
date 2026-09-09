import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { GAME_CONFIG } from '../Config/game.ts';
import { ratioHeight } from './scale.ts';
import { jumpVelocity } from './physics.ts';
import { worldDirection } from './gravity.ts';
import { sampleTerrainAt, findSpawn, stepTerrain } from './terrain.ts';
import { updatePlayerVisuals } from './player_visuals.ts';
import { movementDirection } from './movement_input.ts';
import { damage } from './damage.ts';
import { sound } from './audio.ts';
import { clearHazards } from './particles.ts';
export function jump(ctx: GameContext) {
  if (ctx.state.mode !== 'playing' || !ctx.grounded) return;
  ctx.grounded = false;
  ctx.velocity
    .copy(ctx.gravity.up)
    // Peak height scales with launch speed squared under the same gravity.
    .multiplyScalar(jumpVelocity(ctx.ratio));
  sound(ctx, 390, 0.13, 'sine', 0.04, 750);
}

export function dash(ctx: GameContext) {
  if (ctx.state.mode !== 'playing' || ctx.dashCooldown > 0) return;
  ctx.dashTime = GAME_CONFIG.dashDuration;
  ctx.dashCooldown = GAME_CONFIG.dashCooldown;
  sound(ctx, 180, 0.15, 'sawtooth', 0.018, 500);
}

export function movePlayer(ctx: GameContext, dt: number) {
  if (!ctx.terrain) return;
  const h = ratioHeight(ctx.ratio);
  const up = ctx.gravity.up;
  const move = movementDirection(ctx.keys, ctx.orbitalYaw, ctx.dashTime > 0);
  const speed =
    h *
    GAME_CONFIG.runSpeed *
    (ctx.dashTime > 0 ? GAME_CONFIG.dashMultiplier : 1);
  const delta = worldDirection(
    ctx.gravity,
    move.clone().multiplyScalar(speed * dt),
  );
  let result = stepTerrain(ctx.terrain, ctx.position, delta, h, !ctx.grounded);
  if (result.blocked) {
    const a = stepTerrain(
      ctx.terrain,
      ctx.position,
      worldDirection(ctx.gravity, new THREE.Vector3(move.x * speed * dt, 0, 0)),
      h,
      !ctx.grounded,
    );
    const b = stepTerrain(
      ctx.terrain,
      ctx.position,
      worldDirection(ctx.gravity, new THREE.Vector3(0, 0, move.z * speed * dt)),
      h,
      !ctx.grounded,
    );
    result =
      a.position.distanceToSquared(ctx.position) >
      b.position.distanceToSquared(ctx.position)
        ? a
        : b;
  }
  const traveled = result.position
    .clone()
    .sub(ctx.position)
    .projectOnPlane(up)
    .length();
  ctx.state.distance += traveled;
  ctx.position.copy(result.position);
  const ground = result.ground;
  if (ctx.grounded) {
    if (
      ground &&
      Math.abs(ctx.position.clone().sub(ground.point).dot(up)) < 2 * h
    )
      ctx.position.copy(ground.point);
    else {
      ctx.grounded = false;
      ctx.velocity.set(0, 0, 0);
    }
  }
  if (!ctx.grounded) {
    ctx.velocity.addScaledVector(up, -GAME_CONFIG.gravityAcceleration * h * dt);
    const next = ctx.position.clone().addScaledVector(ctx.velocity, dt);
    const landing = sampleTerrainAt(ctx.terrain, next);
    if (
      landing &&
      ctx.velocity.dot(up) <= 0 &&
      next.clone().sub(landing.point).dot(up) <= 0 &&
      ctx.position.clone().sub(landing.point).dot(up) >= -h * 0.3
    ) {
      ctx.position.copy(landing.point);
      ctx.velocity.set(0, 0, 0);
      ctx.grounded = true;
      sound(ctx, 95, 0.07, 'sine', 0.025, 60);
    } else ctx.position.copy(next);
  }
  if (
    ctx.terrain.bounds.distanceToPoint(ctx.position) > 8 * h ||
    ctx.position.distanceTo(ctx.terrain.center) > 200
  ) {
    damage(ctx, '离开了鞋面');
    if (ctx.state.mode === 'playing') {
      ctx.position.copy(findSpawn(ctx.terrain, ctx.position).point);
      ctx.velocity.set(0, 0, 0);
      ctx.grounded = true;
      ctx.invulnerable = 2;
      clearHazards(ctx);
      ctx.nextHazard = ctx.state.time + 2;
      ctx.transition = 0.5;
    }
  }
  updatePlayerVisuals(ctx, dt, traveled, move, delta, ground);
  ctx.dashCooldown = Math.max(0, ctx.dashCooldown - dt);
  ctx.dashTime = Math.max(0, ctx.dashTime - dt);
  ctx.invulnerable = Math.max(0, ctx.invulnerable - dt);
  ctx.state.dash = 1 - ctx.dashCooldown / GAME_CONFIG.dashCooldown;
}
