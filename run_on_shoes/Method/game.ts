import type { GameController, GameOptions, Snapshot } from '../Types/game.ts';
import { createState } from './state.ts';
import { ratioHeight } from './scale.ts';
import { bindInput, setKey } from './input.ts';
import { advanceFrame } from './frame.ts';
import { resize } from './camera.ts';
import { loadGame } from './assets.ts';
import { start, overview, togglePause, setRatio } from './lifecycle.ts';
import { jump, dash } from './movement.ts';
import { setMuted } from './audio.ts';
import { disposeGame } from './dispose.ts';

/** Compose a browser session. No DOM/WebGL work happens merely by importing it. */
export function createGame(
  host: HTMLElement,
  emit: (snapshot: Snapshot) => void,
  options: GameOptions,
): GameController {
  ratioHeight(options.ratio);
  const ctx = createState(host, emit, options);
  try {
    ctx.cleanupInput = bindInput(ctx);
    ctx.onFrame = (time) => advanceFrame(ctx, time);
    resize(ctx);
    ctx.raf = requestAnimationFrame(ctx.onFrame);
  } catch (error) {
    disposeGame(ctx);
    throw error;
  }
  const active = (action: () => void) => {
    if (!ctx.disposed) action();
  };
  return {
    load: () => {
      if (ctx.disposed) return Promise.reject(new Error('Game is disposed'));
      // Repeated load calls share a single initialization and do not duplicate models.
      ctx.loadPromise ??= loadGame(ctx).catch((error) => {
        disposeGame(ctx);
        throw error;
      });
      return ctx.loadPromise;
    },
    start: () => active(() => start(ctx)),
    overview: () => active(() => overview(ctx)),
    togglePause: () => active(() => togglePause(ctx)),
    setRatio: (ratio) => active(() => setRatio(ctx, ratio)),
    setMuted: (muted) => active(() => setMuted(ctx, muted)),
    key: (key, pressed) => active(() => setKey(ctx, key, pressed)),
    jump: () => active(() => jump(ctx)),
    dash: () => active(() => dash(ctx)),
    read: () => ({ ...ctx.state }),
    dispose: () => disposeGame(ctx),
  };
}
