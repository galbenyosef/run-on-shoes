import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';
import {
  decodeLeaderboard,
  requestLeaderboard,
} from '../Dataset/leaderboard_http.ts';
import { normalizeUsername } from './leaderboard.ts';
import type {
  LeaderboardClient,
  LeaderboardClientOptions,
} from '../Types/leaderboard.ts';

export function createLeaderboardClient(
  options: LeaderboardClientOptions,
): LeaderboardClient {
  let token: string | null = null;
  let initialUsername = '';
  try {
    token =
      options.storage?.getItem(LEADERBOARD_CONFIG.tokenStorageKey) ?? null;
    initialUsername =
      options.storage?.getItem(LEADERBOARD_CONFIG.nameStorageKey) ?? '';
  } catch {
    /* Blocked storage still permits an in-memory anonymous session. */
  }
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    try {
      options.storage?.setItem(LEADERBOARD_CONFIG.tokenStorageKey, token);
    } catch {
      /* session-only identity */
    }
  }
  const playerToken = token;
  const request = (path: string, body?: unknown, signal?: AbortSignal) =>
    requestLeaderboard(
      options.fetcher,
      new URL(path, options.serviceUrl).href,
      playerToken,
      body,
      signal,
    );
  return {
    initialUsername,
    async start(runId) {
      // Retrying this operation preserves the server's original start timestamp.
      try {
        await request('/api/runs', { runId });
      } catch {
        await request('/api/runs', { runId });
      }
    },
    async read(signal) {
      return decodeLeaderboard(
        await request('/api/leaderboard', undefined, signal),
      );
    },
    async submit(runId, username, score, signal) {
      const normalized = normalizeUsername(username);
      const view = decodeLeaderboard(
        await request(
          '/api/scores',
          {
            runId,
            username: normalized,
            timeMs: score.timeMs,
            dodged: score.dodged,
            distanceMm: score.distanceMm,
            ratio: score.ratio,
          },
          signal,
        ),
      );
      this.initialUsername = normalized;
      try {
        options.storage?.setItem(LEADERBOARD_CONFIG.nameStorageKey, normalized);
      } catch {
        /* nickname is optional */
      }
      return view;
    },
  };
}
