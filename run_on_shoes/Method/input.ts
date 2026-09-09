import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { resize } from './camera.ts';
import { togglePause } from './lifecycle.ts';
import { jump, dash } from './movement.ts';
export function setKey(ctx: GameContext, k: string, on: boolean) {
  if (on) ctx.keys.add(k.toLowerCase());
  else ctx.keys.delete(k.toLowerCase());
}

export function onKeyDown(ctx: GameContext, e: KeyboardEvent) {
  const el = e.target as HTMLElement;
  if (el.closest('input,[role="slider"],textarea')) return;
  const k = /^Key[WASD]$/.test(e.code)
    ? e.code.slice(3).toLowerCase()
    : e.key.toLowerCase();
  if (
    [
      ' ',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'shift',
      'escape',
    ].includes(k)
  )
    e.preventDefault();
  if (k === 'escape' && !e.repeat) {
    togglePause(ctx);
    return;
  }
  if (e.code === 'Space' && !e.repeat) jump(ctx);
  if (k === 'shift' && !e.repeat) dash(ctx);
  setKey(ctx, k, true);
}

export function onKeyUp(ctx: GameContext, e: KeyboardEvent) {
  setKey(
    ctx,
    /^Key[WASD]$/.test(e.code)
      ? e.code.slice(3).toLowerCase()
      : e.key.toLowerCase(),
    false,
  );
}

export function blur(ctx: GameContext) {
  ctx.keys.clear();
  ctx.pointer = undefined;
  if (ctx.state.mode === 'playing') togglePause(ctx);
}

export function visibility(ctx: GameContext) {
  if (document.hidden) blur(ctx);
}

export function pointerDown(ctx: GameContext, e: PointerEvent) {
  if (ctx.state.mode === 'playing') {
    ctx.pointer = { x: e.clientX, y: e.clientY };
    ctx.host.setPointerCapture(e.pointerId);
  }
}

export function pointerMove(ctx: GameContext, e: PointerEvent) {
  if (!ctx.pointer || ctx.state.mode !== 'playing') return;
  ctx.orbitalYaw -= (e.clientX - ctx.pointer.x) * 0.004;
  ctx.orbitalPitch = THREE.MathUtils.clamp(
    ctx.orbitalPitch + (e.clientY - ctx.pointer.y) * 0.003,
    0.17,
    1.05,
  );
  ctx.pointer = { x: e.clientX, y: e.clientY };
}

export function pointerUp(ctx: GameContext) {
  ctx.pointer = undefined;
}

export function wheel(ctx: GameContext, e: WheelEvent) {
  if (ctx.state.mode === 'playing') {
    e.preventDefault();
    ctx.cameraDistance = THREE.MathUtils.clamp(
      ctx.cameraDistance + e.deltaY * 0.006,
      4.5,
      22,
    );
  }
}

export function bindInput(ctx: GameContext) {
  const observer = new ResizeObserver(() => resize(ctx));
  const abort = new AbortController();
  const options = { signal: abort.signal };
  observer.observe(ctx.host);
  window.addEventListener('keydown', (e) => onKeyDown(ctx, e), options);
  window.addEventListener('keyup', (e) => onKeyUp(ctx, e), options);
  window.addEventListener('blur', () => blur(ctx), options);
  document.addEventListener('visibilitychange', () => visibility(ctx), options);
  ctx.host.addEventListener('pointerdown', (e) => pointerDown(ctx, e), options);
  ctx.host.addEventListener('pointermove', (e) => pointerMove(ctx, e), options);
  ctx.host.addEventListener('pointerup', () => pointerUp(ctx), options);
  ctx.host.addEventListener('pointercancel', () => pointerUp(ctx), options);
  ctx.host.addEventListener('wheel', (e) => wheel(ctx, e), {
    ...options,
    passive: false,
  });
  return () => {
    observer.disconnect();
    abort.abort();
  };
}
