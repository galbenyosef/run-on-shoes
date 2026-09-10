import { LeaderboardServer } from '../Module/leaderboard_server.ts';
import type { LeaderboardEnvironment } from '../Types/leaderboard_server.ts';

export function handleLeaderboardRequest(
  request: Request,
  env: LeaderboardEnvironment,
) {
  return LeaderboardServer.fetch(request, env);
}
