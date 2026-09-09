import { initialSnapshot } from './snapshot.ts';
import { resolveAssetUrls } from './asset_paths.ts';
import * as THREE from 'three';
import type { GameContext, GameOptions, Snapshot } from '../Types/game.ts';
import { createGravity } from './gravity.ts';
import { createScene } from './scene.ts';
export function createState(
  host: HTMLElement,
  emit: (state: Snapshot) => void,
  options: GameOptions,
): GameContext {
  return {
    host,
    emit,
    assetUrls: resolveAssetUrls(options.baseUrl),
    ...createScene(host),
    raf: 0,
    last: 0,
    disposed: false,
    gravity: createGravity(),
    actions: {},
    action: '',
    position: new THREE.Vector3(),
    spawnPoint: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    grounded: true,
    keys: new Set<string>(),
    hazards: [],
    particles: [],
    nextHazard: 2,
    dashTime: 0,
    dashCooldown: 0,
    invulnerable: 0,
    targetFacing: 0,
    currentFacing: 0,
    orbitalYaw: 0.6,
    orbitalPitch: 0.4,
    cameraDistance: 8.5,
    tick: 0,
    transition: 0,
    shake: 0,
    muted: false,
    webAbort: new AbortController(),
    ratio: options.ratio,
    state: initialSnapshot(),
    cleanupInput: () => {},
    onFrame: () => {},
  };
}
