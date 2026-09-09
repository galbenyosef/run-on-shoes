import { ratioHeight } from './scale.ts';
import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { worldDirection } from './gravity.ts';
import { disposeObject } from './resources.ts';
export function burst(ctx: GameContext, point: THREE.Vector3, h: number) {
  for (let i = 0; i < 20; i++) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(h * (0.08 + Math.random() * 0.17), 0),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffa151 : 0xfa5d30 }),
    );
    mesh.position.copy(point).addScaledVector(ctx.gravity.up, h * 0.3);
    ctx.scene.add(mesh);
    const angle = Math.random() * Math.PI * 2,
      speed = h * (2 + Math.random() * 5);
    const life = 0.5 + Math.random() * 0.7;
    ctx.particles.push({
      mesh,
      v: worldDirection(
        ctx.gravity,
        new THREE.Vector3(
          Math.cos(angle) * speed,
          h * (2 + Math.random() * 6),
          Math.sin(angle) * speed,
        ),
      ),
      life,
      max: life,
    });
  }
}

export function clearHazards(ctx: GameContext) {
  for (const h of ctx.hazards) disposeObject(h.group);
  ctx.hazards = [];
  for (const p of ctx.particles) disposeObject(p.mesh);
  ctx.particles = [];
}

export function updateParticles(ctx: GameContext, dt: number) {
  for (let i = ctx.particles.length - 1; i >= 0; i--) {
    const p = ctx.particles[i];
    p.life -= dt;
    p.v.addScaledVector(ctx.gravity.up, -dt * ratioHeight(ctx.ratio) * 5);
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.scale.setScalar(Math.max(0, p.life / p.max));
    if (p.life <= 0) {
      disposeObject(p.mesh);
      ctx.particles.splice(i, 1);
    }
  }
}
