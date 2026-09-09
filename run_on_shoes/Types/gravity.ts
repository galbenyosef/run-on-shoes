import type * as THREE from 'three';
export interface GravityState {
  orientation: THREE.Quaternion;
  up: THREE.Vector3;
  axis: THREE.Vector3;
  targetAxis: THREE.Vector3;
  untilTurn: number;
  increment: THREE.Quaternion;
  random: () => number;
}
