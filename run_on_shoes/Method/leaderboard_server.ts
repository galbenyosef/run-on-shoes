import {
  LEADERBOARD_CONFIG,
  LEADERBOARD_ORIGINS,
} from '../Config/leaderboard.ts';
import {
  countRequest,
  exportLeaderboard,
  readLeaderboard,
  readStoredRun,
  registerRun,
  saveScore,
} from '../Dataset/leaderboard_store.ts';
import {
  hashPlayerToken,
  LeaderboardError,
  readSubmissionBody,
  validateRunId,
  validateSubmission,
} from './leaderboard_validation.ts';
import type { LeaderboardEnvironment } from '../Types/leaderboard_server.ts';

export async function handleLeaderboardRequest(
  request: Request,
  env: LeaderboardEnvironment,
): Promise<Response> {
  const origin = request.headers.get('origin');
  const allowed =
    origin !== null &&
    (LEADERBOARD_ORIGINS as readonly string[]).includes(origin);
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  });
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Player-Token');
    headers.set('Access-Control-Max-Age', '600');
  }
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  try {
    if (origin && !allowed)
      throw new LeaderboardError('该来源不可提交成绩。', 403);
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && (path === '/' || path === '/health'))
      return json({
        service: 'MICROSTRIDE leaderboard',
        status: 'ok',
        game: 'https://565353780.github.io/run-on-shoes/',
      });
    if (request.method === 'GET' && path === '/api/export') {
      const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
      if (cursor && !/^[a-f0-9]{64}$/.test(cursor))
        throw new LeaderboardError('导出游标无效。');
      return json(await exportLeaderboard(env.DB, cursor));
    }
    if (request.method === 'GET' && path === '/api/leaderboard') {
      const token = request.headers.get('X-Player-Token');
      return json(
        await readLeaderboard(
          env.DB,
          token ? await hashPlayerToken(token) : null,
        ),
      );
    }
    if (
      request.method !== 'POST' ||
      !['/api/runs', '/api/scores'].includes(path)
    )
      throw new LeaderboardError('接口不存在。', 404);
    if (!allowed) throw new LeaderboardError('需要有效的游戏来源。', 403);
    const playerId = await hashPlayerToken(
      request.headers.get('X-Player-Token'),
    );
    const now = Date.now();
    const ip = request.headers.get('CF-Connecting-IP');
    const rateBytes = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        `${Math.floor(now / 86400000)}:${ip ?? playerId}`,
      ),
    );
    const rateKey = Array.from(new Uint8Array(rateBytes), (n) =>
      n.toString(16).padStart(2, '0'),
    ).join('');
    if (
      (await countRequest(env.DB, rateKey, now)) >
      LEADERBOARD_CONFIG.requestsPerMinute
    )
      throw new LeaderboardError('提交过于频繁，请一分钟后重试。', 429);
    const body = await readSubmissionBody(request);
    const runId = validateRunId(body.runId);
    if (path === '/api/runs') {
      const run = await registerRun(env.DB, playerId, runId, now);
      if (!run) throw new LeaderboardError('本局编号已使用，请重新开始。', 409);
      return json({ runId, startedAt: run.started_at });
    }
    const run = await readStoredRun(env.DB, playerId, runId);
    if (!run)
      throw new LeaderboardError(
        '本局未能联网记录，请联网后重新开始一局。',
        409,
      );
    // An accepted run is immutable; retries return the current ranking.
    if (!run.submitted_at) {
      const score = validateSubmission(body, now - run.started_at);
      await saveScore(env.DB, {
        ...score,
        playerId,
        submittedAt: new Date(now).toISOString(),
      });
    }
    return json(await readLeaderboard(env.DB, playerId));
  } catch (error) {
    if (error instanceof LeaderboardError)
      return json({ error: error.message }, error.status);
    console.error(
      'Leaderboard storage request failed',
      error instanceof Error ? error.message : 'unknown',
    );
    return json({ error: '排行榜服务暂时不可用，请稍后重试。' }, 503);
  }
}
