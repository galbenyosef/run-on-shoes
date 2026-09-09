import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  createTerrain,
  sampleTerrain,
  sampleTerrainAt,
  findSpawn,
  stepTerrain,
} from '../Method/terrain.ts';
import { ratioHeight } from '../Method/scale.ts';
import { hazardHits } from '../Method/collision.ts';
import {
  createGravity,
  advanceGravity,
  resetGravity,
  worldDirection,
} from '../Method/gravity.ts';
const assetDirectory = new URL(
  '../../public/models/shoe-master/',
  import.meta.url,
);
const file = readFileSync(new URL('model.gltf', assetDirectory), 'utf8');
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// Surface tests load the actual scene, including node transforms and compressed
// geometry. Texture pixels are checked separately, without a browser in Node.
loader.register((parser) => {
  const loadBuffer = parser.loadBuffer.bind(parser);
  parser.loadBuffer = (index) => {
    const uri = parser.json.buffers[index].uri;
    if (!uri) return loadBuffer(index);
    const data = readFileSync(new URL(uri, assetDirectory));
    return Promise.resolve(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    );
  };
  return {
    name: 'surface-test-assets',
    loadTexture: () => Promise.resolve(new THREE.Texture()),
  };
});
const mesh = (await loader.parseAsync(file, '')).scene;
const box = new THREE.Box3().setFromObject(mesh),
  size = box.getSize(new THREE.Vector3()),
  center = box.getCenter(new THREE.Vector3()),
  s = 100 / Math.max(size.x, size.z);
mesh.scale.setScalar(s);
mesh.position.set(-center.x * s, -box.min.y * s, -center.z * s);
const terrain = createTerrain(mesh);
void test('Actual generated shoe is normalized to length 100 and has a safe real surface spawn', () => {
  assert.ok(
    Math.abs(terrain.bounds.getSize(new THREE.Vector3()).z - 100) < 1e-5,
  );
  const spawn = findSpawn(terrain);
  assert.ok(spawn.normal.y > 0.75);
  assert.ok(spawn.point.y > 20);
  assert.ok(spawn.point.z > 20, 'Start on outer toe, not inside heel cavity');
  const ground = sampleTerrain(terrain, spawn.point.x, spawn.point.z);
  assert.ok(ground);
  assert.ok(ground.point.distanceTo(spawn.point) < 1e-7);
  console.log('Real shoe spawn', spawn.point.toArray());
});
void test('Movement traverses real shoe curvature in four directions without teleporting up walls', () => {
  const spawn = findSpawn(terrain);
  for (const [x, z] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    let pos = spawn.point.clone();
    let moved = 0;
    for (let i = 0; i < 40; i++) {
      const before = pos.clone(),
        r = stepTerrain(
          terrain,
          pos,
          new THREE.Vector3(x * 0.08, 0, z * 0.08),
          1,
        );
      pos = r.position;
      if (r.ground) pos.y = r.ground.point.y;
      moved += Math.hypot(pos.x - before.x, pos.z - before.z);
      assert.ok(Math.abs(pos.y - before.y) <= 1.3);
      assert.ok(Number.isFinite(pos.y));
    }
    assert.ok(moved > 1, `direction ${x},${z} should move more than 1`);
  }
});
void test('Outside mesh is an edge, not an invisible flat platform', () => {
  assert.equal(sampleTerrain(terrain, 150, 150), null);
  const p = new THREE.Vector3(120, 10, 120);
  assert.equal(
    stepTerrain(terrain, p, new THREE.Vector3(1, 0, 0), 1).ground,
    null,
  );
});
void test('Scale slider maps character height to shoe length exactly', () => {
  for (const ratio of [20, 100, 200])
    assert.equal(ratioHeight(ratio) / 100, 1 / ratio);
  assert.throws(() => ratioHeight(0), RangeError);
  assert.throws(() => ratioHeight(NaN), RangeError);
});
void test('Laser danger persists through jumps; meteor waves can be jumped; distant strikes do not hit', () => {
  const zero = new THREE.Vector3();
  assert.equal(hazardHits(zero, zero, 1.5, 1, 'laser', 0), true);
  assert.equal(
    hazardHits(new THREE.Vector3(0, 1, 0), zero, 1.5, 1, 'laser', 1),
    true,
  );
  const higherJump = new THREE.Vector3(0, 3.1, 0);
  assert.equal(hazardHits(higherJump, zero, 1.5, 1, 'laser', 3.1), true);
  assert.equal(hazardHits(higherJump, zero, 2, 1, 'meteor', 3.1), false);
  assert.equal(hazardHits(higherJump, zero, 1.5, 1, 'laser', 0), false);
  assert.equal(
    hazardHits(new THREE.Vector3(0, 1, 0), zero, 2, 1, 'meteor', 1),
    false,
  );
  assert.equal(
    hazardHits(new THREE.Vector3(0, 0.2, 0), zero, 2, 1, 'meteor', 0.2),
    true,
  );
  assert.equal(
    hazardHits(new THREE.Vector3(10, 0, 0), zero, 2, 1, 'meteor', 0),
    false,
  );
});

void test('Gravity turns at 2 degrees per second and carries the camera/input frame with it', () => {
  let seed = 42;
  const frame = createGravity(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  const previous = frame.up.clone();
  for (let i = 0; i < 7200; i++) {
    previous.copy(frame.up);
    advanceGravity(frame, 1 / 60);
    assert.ok(
      Math.abs(previous.angleTo(frame.up) - THREE.MathUtils.degToRad(2) / 60) <
        1e-8,
    );
    assert.ok(Math.abs(frame.up.length() - 1) < 1e-10);
    const cameraUp = worldDirection(frame, new THREE.Vector3(0, 1, 0));
    assert.ok(cameraUp.distanceTo(frame.up) < 1e-10);
    assert.ok(
      Math.abs(
        worldDirection(frame, new THREE.Vector3(1, 0, 0)).dot(frame.up),
      ) < 1e-10,
    );
  }
  const paused = frame.orientation.clone();
  advanceGravity(frame, 0);
  assert.ok(paused.equals(frame.orientation));
  resetGravity(frame);
  assert.ok(frame.up.equals(new THREE.Vector3(0, 1, 0)));
  assert.ok(frame.orientation.equals(new THREE.Quaternion()));
});

void test('Fixed Master mesh supports spawning and four-way movement on upper, side and sole surfaces', () => {
  const originalTransform = mesh.matrixWorld.clone();
  const originalBounds = terrain.bounds.clone();
  const directions = [
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, -1, 0],
    [1, 1, 1],
    [-1, 1, -1],
    [1, -1, 1],
    [-1, -1, -1],
  ];
  try {
    for (const values of directions) {
      terrain.up.set(...(values as [number, number, number])).normalize();
      const spawn = findSpawn(terrain, terrain.center);
      assert.ok(spawn.normal.dot(terrain.up) > 0.75);
      assert.ok(
        sampleTerrainAt(terrain, spawn.point)!.point.distanceTo(spawn.point) <
          1e-6,
      );
      const right = new THREE.Vector3(1, 0, 0).projectOnPlane(terrain.up);
      if (right.lengthSq() < 0.01)
        right.set(0, 0, 1).projectOnPlane(terrain.up);
      right.normalize();
      const forward = right.clone().cross(terrain.up).normalize();
      for (const direction of [
        right,
        right.clone().negate(),
        forward,
        forward.clone().negate(),
      ]) {
        const point = spawn.point.clone();
        let traveled = 0;
        for (let i = 0; i < 16; i++) {
          const result = stepTerrain(
            terrain,
            point,
            direction.clone().multiplyScalar(0.08),
            1,
          );
          assert.ok(
            result.ground,
            'Moving away from a safe spawn must remain on the real surface',
          );
          traveled += result.position
            .clone()
            .sub(point)
            .projectOnPlane(terrain.up)
            .length();
          assert.ok(
            Math.abs(result.ground.point.clone().sub(point).dot(terrain.up)) <
              1.3,
          );
          point.copy(result.ground.point);
        }
        assert.ok(
          traveled > 0.6,
          `surface ${values.join(',')} supports tangent movement`,
        );
      }
      if (values[1] === -1 && values[0] === 0)
        assert.ok(
          spawn.point.y < 5,
          'Inverted gravity lands on the actual outsole',
        );
    }
    assert.ok(
      mesh.matrixWorld.equals(originalTransform),
      'The shoe remains fixed',
    );
    assert.ok(terrain.bounds.equals(originalBounds));
  } finally {
    terrain.up.set(0, 1, 0);
  }
});

void test('Laser and meteor collision distances use current gravity rather than world Y', () => {
  const origin = new THREE.Vector3(),
    up = new THREE.Vector3(1, 0, 0);
  const jump = new THREE.Vector3(1, 0, 0);
  assert.equal(hazardHits(jump, origin, 1.5, 1, 'laser', 1, up), true);
  assert.equal(hazardHits(jump, origin, 2, 1, 'meteor', 1, up), false);
  assert.equal(
    hazardHits(new THREE.Vector3(0, 10, 0), origin, 2, 1, 'laser', 0, up),
    false,
  );
});
