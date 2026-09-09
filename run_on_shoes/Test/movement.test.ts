import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { movementDirection } from '../Method/movement_input.ts';
import { jump, dash } from '../Method/movement.ts';
import type { GameContext } from '../Types/game.ts';
import { createGravity } from '../Method/gravity.ts';
import { initialSnapshot } from '../Method/snapshot.ts';
import { GAME_CONFIG } from '../Config/game.ts';

void test('Camera-relative movement normalizes diagonals, cancels opposites, and supports idle dash', () => {
  assert.ok(
    Math.abs(movementDirection(new Set(['w', 'd']), 0, false).length() - 1) <
      1e-12,
  );
  assert.equal(movementDirection(new Set(['w', 's']), 0, false).length(), 0);
  assert.deepEqual(movementDirection(new Set(), 0, true).toArray(), [0, 0, -1]);
  assert.ok(
    movementDirection(new Set(['w']), Math.PI / 2, false).distanceTo(
      new THREE.Vector3(-1, 0, 0),
    ) < 1e-10,
  );
  assert.ok(
    movementDirection(new Set(['arrowright']), 0, false).equals(
      movementDirection(new Set(['d']), 0, false),
    ),
  );
});

void test('Jump and dash commands honor pause, grounded state, cooldown and rotating gravity', () => {
  // These commands own only physics fields and audio policy, so no renderer is required.
  const ctx = {
    state: { ...initialSnapshot(), mode: 'playing' },
    grounded: true,
    velocity: new THREE.Vector3(),
    gravity: createGravity(() => 0.5),
    ratio: 100,
    muted: true,
    dashCooldown: 0,
    dashTime: 0,
  } as GameContext;
  ctx.gravity.up.set(1, 0, 0);
  jump(ctx);
  assert.equal(ctx.grounded, false);
  assert.ok(Math.abs(ctx.velocity.x - GAME_CONFIG.jumpSpeed) < 1e-12);
  assert.equal(ctx.velocity.y, 0);
  const velocity = ctx.velocity.clone();
  jump(ctx);
  assert.ok(ctx.velocity.equals(velocity), 'Airborne jump is ignored');
  dash(ctx);
  assert.equal(ctx.dashTime, GAME_CONFIG.dashDuration);
  ctx.dashTime = 0;
  dash(ctx);
  assert.equal(ctx.dashTime, 0, 'Cooldown blocks another dash');
  ctx.state.mode = 'paused';
  ctx.dashCooldown = 0;
  ctx.grounded = true;
  ctx.velocity.set(0, 0, 0);
  jump(ctx);
  dash(ctx);
  assert.ok(ctx.grounded);
  assert.equal(ctx.velocity.length(), 0);
  assert.equal(ctx.dashTime, 0);
});
