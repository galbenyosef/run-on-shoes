import type { GameContext } from '../Types/game.ts';
import * as THREE from 'three';
import { GAME_CONFIG } from '../Config/game.ts';
import { start, togglePause } from './lifecycle.ts';
export function registerTools(ctx: GameContext) {
  type Context = {
    registerTool: (tool: unknown, opts: { signal: AbortSignal }) => unknown;
  };
  const c = (document as Document & { modelContext?: Context }).modelContext;
  if (!c?.registerTool) return;
  const tools = [
    {
      name: 'read_shoe_run',
      description: '读取鞋面跑酷游戏状态、角色比例及当前重力与镜头的上方向。',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        ...ctx.state,
        ratio: ctx.ratio,
        gravityUp: ctx.gravity.up.toArray(),
        cameraUp: ctx.camera.up.toArray(),
        gravityDegreesPerSecond: THREE.MathUtils.radToDeg(
          GAME_CONFIG.gravityTurnSpeed,
        ),
      }),
    },
    {
      name: 'start_shoe_run',
      description:
        '按当前比例开始或重新开始鞋面生存跑酷。重新开始会清除当前局分数。',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: () => {
        if (!ctx.state.ready) throw new Error('Models are loading');
        start(ctx);
        return { ...ctx.state, ratio: ctx.ratio };
      },
    },
    {
      name: 'pause_shoe_run',
      description: '暂停正在进行的鞋面跑酷。',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: () => {
        if (ctx.state.mode !== 'playing')
          throw new Error('Game is not playing');
        togglePause(ctx);
        return { mode: ctx.state.mode };
      },
    },
  ];
  for (const t of tools) {
    try {
      Promise.resolve(c.registerTool(t, { signal: ctx.webAbort.signal })).catch(
        () => {},
      );
    } catch {}
  }
}
