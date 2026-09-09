import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import {
  createGame,
  DEFAULT_RATIO,
  initialSnapshot,
} from '../API/run_on_shoes.ts';
import { RunOnShoes } from '../Module/run_on_shoes.ts';
import type { GameController, GameOptions } from '../Types/game.ts';
import { GAME_CONFIG } from '../Config/game.ts';
import { resolveAssetUrls } from '../Method/asset_paths.ts';
import { ratioHeight } from '../Method/scale.ts';
import { jumpVelocity } from '../Method/physics.ts';
import { createTerrain, findSpawn, stepTerrain } from '../Method/terrain.ts';
import { disposeObject } from '../Method/resources.ts';

void test('API forwards options and its default ratio through the static module', async (t) => {
  const host = {} as HTMLElement;
  const emit = () => {};
  const controller = {} as GameController;
  const seen: GameOptions[] = [];
  t.mock.method(
    RunOnShoes,
    'createGame',
    (
      actualHost: HTMLElement,
      actualEmit: typeof emit,
      options: GameOptions,
    ) => {
      assert.equal(actualHost, host);
      assert.equal(actualEmit, emit);
      seen.push(options);
      return controller;
    },
  );
  assert.equal(await createGame(host, emit), controller);
  assert.deepEqual(seen[0], { ratio: DEFAULT_RATIO, baseUrl: './' });
  assert.equal(
    await createGame(host, emit, { ratio: 50, baseUrl: '/run-on-shoes/' }),
    controller,
  );
  assert.deepEqual(seen[1], { ratio: 50, baseUrl: '/run-on-shoes/' });
  const first = initialSnapshot();
  first.health = 0;
  assert.equal(
    initialSnapshot().health,
    3,
    'snapshots must not share mutable state',
  );
});

void test('API rejects an invalid ratio before allocating DOM or WebGL resources', async () => {
  await assert.rejects(
    () => createGame({} as HTMLElement, () => {}, { ratio: 0 }),
    RangeError,
  );
});

void test('All character scales preserve the double jump apex and reject invalid values', () => {
  for (const ratio of [20, 100, 200]) {
    const height = ratioHeight(ratio);
    const oldApex =
      (6.8 * height) ** 2 / (2 * GAME_CONFIG.gravityAcceleration * height);
    const apex =
      jumpVelocity(ratio) ** 2 / (2 * GAME_CONFIG.gravityAcceleration * height);
    assert.ok(Math.abs(apex / oldApex - 2) < 1e-12);
  }
  for (const ratio of [NaN, Infinity, -Infinity, 0, 19, 201]) {
    assert.throws(() => jumpVelocity(ratio), RangeError);
  }
});

void test('Asset URLs stay under root, GitHub project paths, and renamed repository paths', () => {
  for (const page of [
    'https://example.test/',
    'https://example.test/run-on-shoes/',
    'https://example.test/renamed/',
  ]) {
    for (const path of Object.values(resolveAssetUrls('./'))) {
      assert.ok(new URL(path, page).href.startsWith(page));
    }
  }
  assert.match(
    resolveAssetUrls('/run-on-shoes').shoe,
    /^\/run-on-shoes\/models\//,
  );
});

void test('Empty terrain reports no safe spawn rather than inventing an invisible surface', () => {
  const terrain = createTerrain(new THREE.Group());
  // Empty Box3 has zero radius; the search terminates and reports the missing surface.
  assert.throws(() => findSpawn(terrain), /No safe shoe surface spawn/);
  assert.equal(
    stepTerrain(terrain, new THREE.Vector3(), new THREE.Vector3(1, 0, 0), 1)
      .ground,
    null,
  );
});

void test('Subtree cleanup releases shared geometry, material, and texture once', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const counts = { geometry: 0, texture: 0, material: 0 };
  geometry.addEventListener('dispose', () => counts.geometry++);
  texture.addEventListener('dispose', () => counts.texture++);
  material.addEventListener('dispose', () => counts.material++);
  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  );
  disposeObject(root);
  disposeObject(root);
  assert.deepEqual(counts, { geometry: 1, texture: 1, material: 1 });
  assert.equal(root.children.length, 0);
});
