import { handleLeaderboardRequest } from '../API/leaderboard_server.ts';

export function createLeaderboardWorker() {
  return { fetch: handleLeaderboardRequest };
}
