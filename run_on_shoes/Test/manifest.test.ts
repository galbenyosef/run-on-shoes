import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('docs/assets-manifest.json', root), 'utf8'),
) as {
  files: Record<string, { bytes: number; sha256: string }>;
};

void test('All runtime models retain the exact source bytes recorded during migration', () => {
  for (const [file, expected] of Object.entries(manifest.files)) {
    const bytes = readFileSync(new URL(file, root));
    assert.equal(bytes.byteLength, expected.bytes, file);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      expected.sha256,
      file,
    );
  }
});

void test('The runner retains its skinned geometry and Idle, Run, Jump animations', () => {
  const buffer = readFileSync(new URL('public/models/runner.glb', root));
  assert.equal(buffer.toString('utf8', 0, 4), 'glTF');
  const jsonSize = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonSize)) as {
    animations: { name: string }[];
    skins: { joints: number[] }[];
  };
  assert.deepEqual(gltf.animations.map((animation) => animation.name).sort(), [
    'Idle',
    'Jump',
    'Run',
  ]);
  assert.ok(gltf.skins.some((skin) => skin.joints.length > 0));
});
