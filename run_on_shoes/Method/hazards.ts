import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { ratioHeight } from './scale.ts';
import { hazardHits } from './collision.ts';
import { worldDirection } from './gravity.ts';
import {
  sampleTerrainAt,
  sampleOptionalTerrain,
  type Ground,
} from './terrain.ts';
import { burst, updateParticles } from './particles.ts';
import { damage } from './damage.ts';
import { sound } from './audio.ts';
import { disposeObject } from './resources.ts';
export function spawnHazard(
  ctx: GameContext,
  type: 'laser' | 'meteor',
  forced?: THREE.Vector3,
) {
  if (!ctx.terrain) return;
  const h = ratioHeight(ctx.ratio);
  let g: Ground | null = null;
  for (let i = 0; i < 12; i++) {
    const targeted = Math.random() < 0.48;
    const spread = targeted ? 2.8 : 12;
    const theta = Math.random() * Math.PI * 2,
      r = Math.random() * spread * h;
    const candidate = forced
      ? forced.clone()
      : ctx.position
          .clone()
          .add(
            worldDirection(
              ctx.gravity,
              new THREE.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r),
            ),
          );
    g = sampleTerrainAt(ctx.terrain, candidate);
    if (
      g &&
      Math.abs(g.point.clone().sub(ctx.position).dot(ctx.gravity.up)) < h * 12
    )
      break;
    g = null;
  }
  if (!g) return;
  const radius = h * (type === 'laser' ? 1.25 : 2.4);
  const color = type === 'laser' ? 0xff526f : 0xffaf5d;
  const group = new THREE.Group();
  group.position.copy(g.point);
  group.quaternion.copy(ctx.gravity.orientation);
  ctx.scene.add(group);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.94, radius, 64),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  const localNormal = g.normal
    .clone()
    .applyQuaternion(group.quaternion.clone().invert());
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);
  ring.position.copy(localNormal).multiplyScalar(0.04 * h);
  group.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  );
  disc.quaternion.copy(ring.quaternion);
  disc.position.copy(ring.position);
  group.add(disc);
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(
      type === 'meteor' ? radius * 0.62 : h * 0.09,
      1,
    ),
    new THREE.MeshStandardMaterial({
      color: type === 'meteor' ? 0x462419 : color,
      emissive: color,
      emissiveIntensity: type === 'meteor' ? 0.7 : 3,
      roughness: 0.95,
      flatShading: true,
    }),
  );
  body.position.y = h * 40;
  group.add(body);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(
      type === 'meteor' ? h * 0.22 : h * 0.09,
      type === 'meteor' ? h * 0.4 : h * 0.09,
      h * 65,
      10,
      1,
      true,
    ),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  beam.position.y = h * 32.5;
  group.add(beam);
  ctx.hazards.push({
    type,
    point: g.point.clone(),
    normal: g.normal,
    age: 0,
    delay: type === 'laser' ? 1.45 : 1.9,
    radius,
    group,
    ring,
    disc,
    body,
    beam,
    resolved: false,
    hit: false,
    h,
  });
  sound(
    ctx,
    type === 'laser' ? 840 : 220,
    0.08,
    'sine',
    0.018,
    type === 'laser' ? 1050 : 180,
  );
}

export function updateHazards(ctx: GameContext, dt: number) {
  for (let i = ctx.hazards.length - 1; i >= 0; i--) {
    const a = ctx.hazards[i];
    const surface = sampleOptionalTerrain(ctx.terrain, a.point);
    // Retire a strike once its target turns away from the current sky. Beams
    // must not pass through the shoe to hit a hidden underside warning.
    if (!surface || surface.point.distanceTo(a.point) > a.h * 0.6) {
      disposeObject(a.group);
      ctx.hazards.splice(i, 1);
      continue;
    }
    a.group.quaternion.copy(ctx.gravity.orientation);
    const localNormal = a.normal
      .clone()
      .applyQuaternion(a.group.quaternion.clone().invert());
    a.ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      localNormal,
    );
    a.ring.position.copy(localNormal).multiplyScalar(0.04 * a.h);
    a.disc.quaternion.copy(a.ring.quaternion);
    a.disc.position.copy(a.ring.position);
    a.age += dt;
    const progress = Math.min(1, a.age / a.delay);
    a.ring.material.opacity = 0.45 + 0.45 * Math.sin(a.age * 18) ** 2;
    a.disc.scale.setScalar(Math.max(0.08, progress));
    if (a.age < a.delay) {
      a.body.position.y =
        a.h * (a.type === 'meteor' ? 40 * (1 - progress * progress) + 1 : 45);
      a.body.rotation.x += dt * 2;
      a.body.rotation.z += dt * 3;
      if (a.type === 'meteor') {
        a.beam.position.y = a.body.position.y + a.h * 6;
        a.beam.scale.y = 0.18;
      } else a.beam.scale.x = a.beam.scale.z = 0.35 + progress * 0.65;
    } else {
      const elapsed = a.age - a.delay;
      if (!a.resolved) {
        a.resolved = true;
        ctx.shake = Math.max(ctx.shake, a.type === 'meteor' ? 0.3 : 0.1);
        sound(
          ctx,
          a.type === 'meteor' ? 75 : 140,
          a.type === 'meteor' ? 0.4 : 0.2,
          'sawtooth',
          a.type === 'meteor' ? 0.04 : 0.025,
          35,
        );
        if (a.type === 'meteor') burst(ctx, a.point, a.h);
        a.body.visible = false;
      }
      if (a.type === 'laser') {
        a.beam.scale.set(6, 1, 6);
        (a.beam.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.95 - elapsed * 1.8,
        );
        a.disc.scale.setScalar(1);
        a.ring.scale.setScalar(1 + elapsed * 0.5);
      } else {
        a.beam.visible = false;
        const spread = 1 + elapsed * 3;
        a.ring.scale.setScalar(spread);
        a.ring.material.opacity = Math.max(0, 0.95 - elapsed);
        (a.disc.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.3 - elapsed * 0.4,
        );
        a.disc.scale.setScalar(spread);
      }
      const active = elapsed < (a.type === 'laser' ? 0.38 : 0.72);
      const radius = a.radius * (a.type === 'laser' ? 1 : 1 + elapsed * 3);
      const ground = sampleOptionalTerrain(ctx.terrain, ctx.position);
      const jumpHeight = ground
        ? ctx.position.clone().sub(ground.point).dot(ctx.gravity.up)
        : 100;
      if (
        active &&
        !a.hit &&
        ctx.state.mode === 'playing' &&
        hazardHits(
          ctx.position,
          a.point,
          radius,
          a.h,
          a.type,
          jumpHeight,
          ctx.gravity.up,
        )
      ) {
        a.hit = true;
        damage(ctx, a.type === 'laser' ? '被激光击中' : '被陨石冲击波击中');
      }
      if (elapsed > 1.15) {
        if (!a.hit) ctx.state.dodged++;
        disposeObject(a.group);
        ctx.hazards.splice(i, 1);
      }
    }
  }
  updateParticles(ctx, dt);
}
