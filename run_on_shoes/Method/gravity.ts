import * as THREE from 'three';
import type { GravityState } from '../Types/gravity.ts';
export type { GravityState } from '../Types/gravity.ts';
import { GAME_CONFIG } from '../Config/game.ts';
export function createGravity(
  random: () => number = Math.random,
): GravityState {
  const state: GravityState = {
    orientation: new THREE.Quaternion(),
    up: new THREE.Vector3(0, 1, 0).clone(),
    axis: new THREE.Vector3(),
    targetAxis: new THREE.Vector3(),
    untilTurn: 0,
    increment: new THREE.Quaternion(),
    random,
  };

  state.random = random;
  resetGravity(state);

  return state;
}
export function resetGravity(state: GravityState) {
  state.orientation.identity();
  state.up.copy(new THREE.Vector3(0, 1, 0));
  const angle = state.random() * Math.PI * 2;
  state.axis.set(Math.cos(angle), 0, Math.sin(angle));
  state.targetAxis.copy(state.axis);
  state.untilTurn =
    GAME_CONFIG.gravityTurnMinSeconds +
    state.random() * GAME_CONFIG.gravityTurnRangeSeconds;
}
export function advanceGravity(state: GravityState, dt: number) {
  if (dt <= 0) return;
  state.untilTurn -= dt;
  if (state.untilTurn <= 0) {
    state.targetAxis
      .copy(state.axis)
      .applyAxisAngle(
        state.up,
        (state.random() - 0.5) * Math.PI * GAME_CONFIG.gravityAxisSpread,
      );
    state.untilTurn +=
      GAME_CONFIG.gravityTurnMinSeconds +
      state.random() * GAME_CONFIG.gravityTurnRangeSeconds;
  }
  state.targetAxis.projectOnPlane(state.up).normalize();
  state.axis.lerp(
    state.targetAxis,
    1 - Math.exp(-dt * GAME_CONFIG.gravityAxisBlend),
  );
  state.axis.projectOnPlane(state.up).normalize();
  state.increment.setFromAxisAngle(
    state.axis,
    GAME_CONFIG.gravityTurnSpeed * dt,
  );
  state.orientation.premultiply(state.increment).normalize();
  state.up.copy(new THREE.Vector3(0, 1, 0)).applyQuaternion(state.orientation);
}
export function worldDirection(state: GravityState, local: THREE.Vector3) {
  return local.applyQuaternion(state.orientation);
}
