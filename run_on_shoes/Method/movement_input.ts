import * as THREE from 'three';

/** Normalize diagonal input, apply forward dash fallback, then rotate by camera yaw. */
export function movementDirection(
  keys: ReadonlySet<string>,
  yaw: number,
  dashing: boolean,
) {
  const x =
    Number(keys.has('d') || keys.has('arrowright')) -
    Number(keys.has('a') || keys.has('arrowleft'));
  const z =
    Number(keys.has('s') || keys.has('arrowdown')) -
    Number(keys.has('w') || keys.has('arrowup'));
  const axis = new THREE.Vector3(x, 0, z).normalize();
  if (dashing && axis.lengthSq() === 0) axis.set(0, 0, -1);
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  return new THREE.Vector3(
    axis.x * cos + axis.z * sin,
    0,
    -axis.x * sin + axis.z * cos,
  );
}
