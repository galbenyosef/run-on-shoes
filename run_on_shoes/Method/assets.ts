import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { GAME_CONFIG } from '../Config/game.ts';
import { ratioHeight } from './scale.ts';
import { createTerrain, findSpawn } from './terrain.ts';
import { loadAssets } from '../Dataset/assets.ts';
import { resize } from './camera.ts';
import { notify } from './snapshot.ts';
import { disposeObject } from './resources.ts';
import { registerTools } from './webmcp.ts';
export async function loadGame(ctx: GameContext) {
  const { shoe, runner: char } = await loadAssets(
    ctx.assetUrls,
    ctx.webAbort.signal,
  );
  if (ctx.disposed) {
    disposeObject(shoe.scene);
    disposeObject(char.scene);
    return;
  }
  ctx.shoe = shoe.scene;
  ctx.avatar = char.scene;
  ctx.scene.add(ctx.shoe);
  ctx.player.add(ctx.avatar);
  const box = new THREE.Box3().setFromObject(ctx.shoe),
    size = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const scale = GAME_CONFIG.shoeLength / Math.max(size.x, size.z);
  ctx.shoe.scale.setScalar(scale);
  ctx.shoe.position.set(
    -center.x * scale,
    -box.min.y * scale,
    -center.z * scale,
  );
  ctx.shoe.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.roughness = Math.max(m.roughness, 0.6);
          m.metalness = Math.min(m.metalness, 0.18);
          if (m.map)
            m.map.anisotropy = Math.min(
              8,
              ctx.renderer.capabilities.getMaxAnisotropy(),
            );
        }
      });
    }
  });
  ctx.terrain = createTerrain(ctx.shoe);
  ctx.terrain.up = ctx.gravity.up;
  ctx.stage.position.copy(ctx.terrain.center);
  ctx.avatar.scale.setScalar(ratioHeight(ctx.ratio) / GAME_CONFIG.avatarHeight);
  ctx.mixer = new THREE.AnimationMixer(ctx.avatar);
  for (const clip of char.animations) {
    const action = ctx.mixer.clipAction(clip);
    action.setEffectiveWeight(clip.name === 'Idle' ? 1 : 0).play();
    ctx.actions[clip.name] = action;
  }
  ctx.action = 'Idle';
  ctx.player.visible = false;
  const spawn = findSpawn(ctx.terrain);
  ctx.spawnPoint.copy(spawn.point);
  ctx.state = { ...ctx.state, mode: 'overview', ready: true, message: '' };
  registerTools(ctx);
  notify(ctx);
  resize(ctx);
}
