import type { GameContext } from '../Types/game.ts';
export function ensureAudio(ctx: GameContext) {
  if (!ctx.audio) {
    try {
      ctx.audio = new AudioContext();
    } catch {}
  }
  void ctx.audio?.resume();
}

export function setMuted(ctx: GameContext, v: boolean) {
  ctx.muted = v;
}

export function sound(
  ctx: GameContext,
  freq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  end: number,
) {
  if (ctx.muted || !ctx.audio || ctx.audio.state !== 'running') return;
  const osc = ctx.audio.createOscillator(),
    gain = ctx.audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(20, end),
    ctx.audio.currentTime + duration,
  );
  gain.gain.setValueAtTime(volume, ctx.audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.audio.currentTime + duration,
  );
  osc.connect(gain);
  gain.connect(ctx.audio.destination);
  osc.start();
  osc.stop(ctx.audio.currentTime + duration);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
