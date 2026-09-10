import { handleLeaderboardRequest } from '../Method/leaderboard_server.ts';
import type { LeaderboardEnvironment } from '../Types/leaderboard_server.ts';

export class LeaderboardServer {
  static fetch(request: Request, env: LeaderboardEnvironment) {
    return handleLeaderboardRequest(request, env);
  }
}
