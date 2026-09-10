import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';
import type { LeaderboardView } from '../Types/leaderboard.ts';

export async function requestLeaderboard(
  fetcher: typeof fetch,
  url: string,
  token: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, LEADERBOARD_CONFIG.requestTimeoutMs);
  try {
    const response = await fetcher(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Player-Token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = (await response.json()) as { error?: unknown };
    if (!response.ok)
      throw new Error(
        typeof data?.error === 'string'
          ? data.error
          : '排行榜服务暂时不可用，请稍后重试。',
      );
    return data;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted)
      throw new Error('排行榜连接超时，请重试。');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export function decodeLeaderboard(value: unknown): LeaderboardView {
  if (!value || typeof value !== 'object') throw new Error('排行榜数据无效。');
  const view = value as LeaderboardView;
  if (
    !Array.isArray(view.top) ||
    view.top.length > LEADERBOARD_CONFIG.topCount ||
    !Number.isSafeInteger(view.totalPlayers) ||
    view.totalPlayers < 0
  )
    throw new Error('排行榜数据无效。');
  for (const row of [...view.top, ...(view.personal ? [view.personal] : [])]) {
    if (
      !row ||
      typeof row.playerId !== 'string' ||
      typeof row.username !== 'string' ||
      !Number.isSafeInteger(row.rank) ||
      row.rank < 1 ||
      !Number.isSafeInteger(row.timeMs) ||
      row.timeMs < 0 ||
      !Number.isSafeInteger(row.dodged) ||
      row.dodged < 0
    )
      throw new Error('排行榜数据无效。');
  }
  return {
    top: view.top,
    personal: view.personal ?? null,
    totalPlayers: view.totalPlayers,
  };
}
