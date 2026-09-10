import { GAME_CONFIG } from '../Config/game.ts';
import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';
import { normalizeUsername } from './leaderboard.ts';
import type { RunScore } from '../Types/leaderboard.ts';

export class LeaderboardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateRunId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new LeaderboardError('本局记录无效，请重新开始游戏。');
  return value;
}

export async function hashPlayerToken(token: string | null): Promise<string> {
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new LeaderboardError('玩家标识无效，请刷新页面。', 401);
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function validateSubmission(
  value: Record<string, unknown>,
  elapsedMs: number,
): RunScore & { username: string; runId: string } {
  const { timeMs, dodged, distanceMm, ratio } = value;
  if (
    ![timeMs, dodged, distanceMm, ratio].every(
      (n) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0,
    )
  )
    throw new LeaderboardError('成绩数据无效。');
  const score = { timeMs, dodged, distanceMm, ratio } as RunScore;
  if (
    score.timeMs > LEADERBOARD_CONFIG.maxRunMs ||
    score.timeMs > elapsedMs + LEADERBOARD_CONFIG.clockToleranceMs
  )
    throw new LeaderboardError('本局计时校验未通过，请重新开始联网游戏。');
  if (
    score.ratio < GAME_CONFIG.minRatio ||
    score.ratio > GAME_CONFIG.maxRatio ||
    score.ratio % GAME_CONFIG.ratioStep !== 0
  )
    throw new LeaderboardError('角色比例无效。');
  if (
    score.dodged > (score.timeMs / 1000) * 10 + 10 ||
    score.distanceMm > ((score.timeMs / 1000) * 75 + 100) * 1000
  )
    throw new LeaderboardError('成绩超出游戏允许范围。');
  if (typeof value.username !== 'string')
    throw new LeaderboardError('请输入用户名。');
  let username: string;
  try {
    username = normalizeUsername(value.username);
  } catch (error) {
    throw new LeaderboardError(
      error instanceof Error ? error.message : '用户名无效。',
    );
  }
  return { ...score, username, runId: validateRunId(value.runId) };
}

export async function readSubmissionBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new LeaderboardError('请求格式必须为 JSON。', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new LeaderboardError('请求为空。');
  let length = 0;
  let body = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > LEADERBOARD_CONFIG.maxBodyBytes) {
        await reader.cancel();
        throw new LeaderboardError('请求内容过长。', 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new LeaderboardError('请求 JSON 无效。');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new LeaderboardError('请求格式无效。');
  return data as Record<string, unknown>;
}
