import { Leaderboard } from '../Module/leaderboard.ts';
import type { LeaderboardEntry } from '../Types/leaderboard.ts';
import type { LeaderboardClientOptions } from '../Types/leaderboard.ts';
import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';

export type {
  LeaderboardEntry,
  LeaderboardView,
  RankedEntry,
  RunScore,
  LeaderboardClient,
} from '../Types/leaderboard.ts';

export function createLeaderboardClient(
  options: Partial<LeaderboardClientOptions> = {},
) {
  let storage: Storage | null = null;
  try {
    storage = typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    /* optional browser preference */
  }
  return Leaderboard.createClient({
    serviceUrl: LEADERBOARD_CONFIG.serviceUrl,
    fetcher: fetch,
    storage,
    ...options,
  });
}

export function normalizeUsername(value: string) {
  return Leaderboard.normalizeUsername(value);
}

export function rankLeaderboard(
  entries: readonly LeaderboardEntry[],
  playerId: string | null = null,
) {
  return Leaderboard.rank(entries, playerId);
}
