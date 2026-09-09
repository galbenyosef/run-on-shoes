import * as THREE from 'three';
export function hazardHits(
  player: THREE.Vector3,
  impact: THREE.Vector3,
  radius: number,
  height: number,
  type: 'laser' | 'meteor',
  jumpHeight: number,
  up = new THREE.Vector3(0, 1, 0),
) {
  const separation = player.clone().sub(impact);
  const altitude = separation.dot(up);
  if (
    separation.clone().addScaledVector(up, -altitude).length() >
    radius + height * 0.18
  )
    return false;
  // Compare the supporting surface so higher jumps stay inside the laser column.
  const surfaceAltitude = altitude - Math.max(0, jumpHeight);
  if (Math.abs(surfaceAltitude) > Math.max(height * 3, radius)) return false;
  return type === 'laser' || jumpHeight < height * 0.65;
}
