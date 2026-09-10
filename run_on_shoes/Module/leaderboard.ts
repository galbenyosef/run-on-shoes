import { normalizeUsername, rankLeaderboard } from '../Method/leaderboard.ts';
import type { LeaderboardEntry } from '../Types/leaderboard.ts';
import type { LeaderboardClientOptions } from '../Types/leaderboard.ts';
import { createLeaderboardClient } from '../Method/leaderboard_client.ts';

export class Leaderboard {
  static createClient(options: LeaderboardClientOptions) {
    return createLeaderboardClient(options);
  }
  static normalizeUsername(value: string) {
    return normalizeUsername(value);
  }

  static rank(entries: readonly LeaderboardEntry[], playerId: string | null) {
    return rankLeaderboard(entries, playerId);
  }
}
