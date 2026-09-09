import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { ratioHeight } from './scale.ts';
import { worldDirection } from './gravity.ts';
import { sampleOptionalTerrain } from './terrain.ts';
export function resize(ctx: GameContext) {
  const w = ctx.host.clientWidth,
    h = ctx.host.clientHeight;
  if (!w || !h) return;
  ctx.renderer.setSize(w, h);
  ctx.camera.aspect = w / h;
  if (ctx.state.mode === 'overview' || ctx.state.mode === 'loading') {
    if (w > 760) ctx.camera.setViewOffset(w, h, -w * 0.15, 0, w, h);
    else ctx.camera.setViewOffset(w, h, 0, h * 0.18, w, h);
  } else ctx.camera.clearViewOffset();
  ctx.camera.updateProjectionMatrix();
}

export function updateCamera(ctx: GameContext, dt: number) {
  const h = ratioHeight(ctx.ratio);
  const up = ctx.gravity.up;
  const target = ctx.position.clone().addScaledVector(up, h * 1.1);
  const d = ctx.cameraDistance * h;
  const offset = worldDirection(
    ctx.gravity,
    new THREE.Vector3(
      Math.sin(ctx.orbitalYaw) * Math.cos(ctx.orbitalPitch) * d,
      Math.sin(ctx.orbitalPitch) * d,
      Math.cos(ctx.orbitalYaw) * Math.cos(ctx.orbitalPitch) * d,
    ),
  );
  const desired = target.clone().add(offset);
  const under = sampleOptionalTerrain(ctx.terrain, desired);
  if (under) {
    const clearance = desired.clone().sub(under.point).dot(up);
    if (clearance < h * 1.6) desired.addScaledVector(up, h * 1.6 - clearance);
  }
  if (ctx.transition > 0) {
    ctx.transition -= dt;
    ctx.camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
  } else ctx.camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
  if (ctx.shake > 0) {
    ctx.camera.position.add(
      worldDirection(
        ctx.gravity,
        new THREE.Vector3(
          (Math.random() - 0.5) * ctx.shake * h,
          (Math.random() - 0.5) * ctx.shake * h,
          0,
        ),
      ),
    );
    ctx.shake = Math.max(0, ctx.shake - dt * 1.8);
  }
  ctx.camera.up.copy(up);
  ctx.camera.lookAt(target);
}
