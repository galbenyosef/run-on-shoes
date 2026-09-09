import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { loadAssets, type AssetLoader } from '../Dataset/assets.ts';
import { disposeObject } from '../Method/resources.ts';

function asset() {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  let disposed = 0;
  geometry.addEventListener('dispose', () => disposed++);
  return { value: { scene } as GLTF, disposed: () => disposed };
}

const urls = { shoe: 'shoe', runner: 'runner' };

void test('Successful decoded assets transfer ownership to the caller', async () => {
  const shoe = asset(),
    runner = asset();
  const signal = new AbortController();
  const loader: AssetLoader = {
    loadAsync: async (url) => (url === 'shoe' ? shoe.value : runner.value),
  };
  const result = await loadAssets(urls, signal.signal, loader);
  assert.equal(result.shoe, shoe.value);
  signal.abort();
  assert.equal(shoe.disposed(), 0, 'success must remove abort ownership');
  disposeObject(result.shoe.scene);
  disposeObject(result.runner.scene);
});

void test('A failed model load releases the other successfully decoded model', async () => {
  const shoe = asset();
  const failure = new Error('missing runner');
  const loader: AssetLoader = {
    loadAsync: async (url) => {
      if (url === 'runner') throw failure;
      return shoe.value;
    },
  };
  await assert.rejects(
    loadAssets(urls, new AbortController().signal, loader),
    (error) => error === failure,
  );
  assert.equal(shoe.disposed(), 1);
});

void test('Disposing during a load releases both completed and late-arriving assets', async () => {
  const shoe = asset(),
    runner = asset();
  const abort = new AbortController();
  let finish!: (asset: GLTF) => void;
  const loader: AssetLoader = {
    loadAsync: (url) =>
      url === 'shoe'
        ? Promise.resolve(shoe.value)
        : new Promise<GLTF>((resolve) => {
            finish = resolve;
          }),
  };
  const pending = loadAssets(urls, abort.signal, loader);
  await Promise.resolve();
  abort.abort();
  assert.equal(shoe.disposed(), 1);
  finish(runner.value);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(runner.disposed(), 1);
  assert.equal(shoe.disposed(), 1);
});

void test('Already aborted requests do not start model loading', async () => {
  let called = 0;
  const loader: AssetLoader = {
    loadAsync: async () => {
      called++;
      throw new Error('unexpected request');
    },
  };
  await assert.rejects(loadAssets(urls, AbortSignal.abort(), loader), {
    name: 'AbortError',
  });
  assert.equal(called, 0);
});
