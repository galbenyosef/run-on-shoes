import type * as THREE from 'three';
export type Ground = { point: THREE.Vector3; normal: THREE.Vector3 };
export interface TerrainState {
  meshes: THREE.Mesh[];
  bounds: THREE.Box3;
  ray: THREE.Raycaster;
  up: THREE.Vector3;
  center: THREE.Vector3;
  radius: number;
}
