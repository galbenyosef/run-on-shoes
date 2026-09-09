import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { disposeObject } from '../Method/resources.ts';

export type AssetUrls = Readonly<{ shoe: string; runner: string }>;
export type GameAssets = { shoe: GLTF; runner: GLTF };
export type AssetLoader = Pick<GLTFLoader, 'loadAsync'>;

/** Decode both assets; caller owns successful results, this function owns failure cleanup. */
export async function loadAssets(
  urls: AssetUrls,
  signal: AbortSignal,
  loader: AssetLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
): Promise<GameAssets> {
  signal.throwIfAborted();
  const loaded = new Set<GLTF>();
  const release = () => {
    for (const asset of loaded) disposeObject(asset.scene);
    loaded.clear();
  };
  signal.addEventListener('abort', release, { once: true });
  const load = async (url: string) => {
    const asset = await loader.loadAsync(url);
    if (signal.aborted) {
      disposeObject(asset.scene);
      signal.throwIfAborted();
    }
    loaded.add(asset);
    return asset;
  };
  try {
    const results = await Promise.allSettled([
      load(urls.shoe),
      load(urls.runner),
    ]);
    signal.throwIfAborted();
    const [shoe, runner] = results;
    if (shoe.status === 'rejected') throw shoe.reason;
    if (runner.status === 'rejected') throw runner.reason;
    return { shoe: shoe.value, runner: runner.value };
  } catch (error) {
    release();
    throw error;
  } finally {
    signal.removeEventListener('abort', release);
  }
}
