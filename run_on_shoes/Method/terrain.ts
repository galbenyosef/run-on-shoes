import * as THREE from 'three';
import type { Ground, TerrainState } from '../Types/terrain.ts';
export type { Ground, TerrainState } from '../Types/terrain.ts';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
export function createTerrain(root: THREE.Object3D): TerrainState {
  const state: TerrainState = {
    meshes: [],
    bounds: new THREE.Box3(),
    ray: new THREE.Raycaster(),
    up: new THREE.Vector3(0, 1, 0),
    center: new THREE.Vector3(),
    radius: 0,
  };

  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.computeBoundingBox();
      computeBoundsTree.call(o.geometry);
      o.raycast = acceleratedRaycast;
      state.meshes.push(o);
    }
  });
  state.bounds.setFromObject(root);
  state.bounds.getCenter(state.center);
  state.radius = state.bounds.getSize(new THREE.Vector3()).length() / 2;
  (state.ray as THREE.Raycaster & { firstHitOnly: boolean }).firstHitOnly =
    true;

  return state;
}
export function sampleTerrain(
  state: TerrainState,
  x: number,
  z: number,
): Ground | null {
  return sampleTerrainAt(state, new THREE.Vector3(x, 0, z));
}
export function sampleTerrainAt(
  state: TerrainState,
  position: THREE.Vector3,
): Ground | null {
  const altitude = position.clone().sub(state.center).dot(state.up);
  state.ray.set(
    position.clone().addScaledVector(state.up, state.radius + 10 - altitude),
    state.up.clone().negate(),
  );
  const hit = state.ray.intersectObjects(state.meshes, false)[0];
  if (!hit || !hit.face) return null;
  const normal = hit.face.normal
    .clone()
    .transformDirection(hit.object.matrixWorld);
  if (normal.dot(state.up) < 0.12) return null;
  return { point: hit.point, normal };
}
export function findSpawn(
  state: TerrainState,
  preferred = new THREE.Vector3(0, 0, 32),
) {
  const options: Ground[] = [];
  const right = new THREE.Vector3(1, 0, 0).projectOnPlane(state.up);
  if (right.lengthSq() < 0.01) right.set(0, 0, 1).projectOnPlane(state.up);
  right.normalize();
  const forward = right.clone().cross(state.up).normalize();
  const check = (position: THREE.Vector3) => {
    const g = sampleTerrainAt(state, position);
    if (g && g.normal.dot(state.up) > 0.75) {
      let valid = 0;
      for (const [dx, dz] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        const n = sampleTerrainAt(
          state,
          position
            .clone()
            .addScaledVector(right, dx)
            .addScaledVector(forward, dz),
        );
        if (n && Math.abs(n.point.clone().sub(g.point).dot(state.up)) < 2)
          valid++;
      }
      if (valid === 4) options.push(g);
    }
  };
  for (let z = -9; z <= 6; z += 3) {
    for (let x = -3; x <= 3; x += 3) {
      check(
        preferred.clone().addScaledVector(right, x).addScaledVector(forward, z),
      );
    }
  }
  // A respawn must find the currently exposed surface, including side panels
  // and the sole. The initial toe coordinates are not valid for every gravity.
  if (!options.length) {
    for (let z = -state.radius; z <= state.radius; z += 4) {
      for (let x = -state.radius; x <= state.radius; x += 4) {
        check(
          state.center
            .clone()
            .addScaledVector(right, x)
            .addScaledVector(forward, z),
        );
      }
    }
  }
  options.sort(
    (a, b) =>
      a.point.clone().sub(preferred).projectOnPlane(state.up).lengthSq() -
      b.point.clone().sub(preferred).projectOnPlane(state.up).lengthSq(),
  );
  if (!options.length) throw new Error('No safe shoe surface spawn');
  return options[0];
}
export function stepTerrain(
  state: TerrainState,
  position: THREE.Vector3,
  delta: THREE.Vector3,
  height: number,
  airborne = false,
) {
  const candidate = position.clone().add(delta),
    ground = sampleTerrainAt(state, candidate);
  if (!ground) return { position: candidate, ground: null, blocked: false };
  const tooHigh =
    ground.point.clone().sub(position).dot(state.up) >
    (airborne ? 0.25 : 1.25) * height;
  if (tooHigh)
    return {
      position: position.clone(),
      ground: sampleTerrainAt(state, position),
      blocked: true,
    };
  return { position: candidate, ground, blocked: false };
}

export function sampleOptionalTerrain(
  terrain: TerrainState | undefined,
  position: THREE.Vector3,
) {
  return terrain ? sampleTerrainAt(terrain, position) : null;
}
