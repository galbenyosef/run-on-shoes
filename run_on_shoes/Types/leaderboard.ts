export type RunScore = {
  timeMs: number;
  dodged: number;
  distanceMm: number;
  ratio: number;
};

export type LeaderboardEntry = RunScore & {
  playerId: string;
  username: string;
  runId: string;
  submittedAt: string;
};

export type RankedEntry = LeaderboardEntry & { rank: number };

export type LeaderboardView = {
  top: RankedEntry[];
  personal: RankedEntry | null;
  totalPlayers: number;
};

export type LeaderboardClient = {
  initialUsername: string;
  start: (runId: string) => Promise<void>;
  read: (signal?: AbortSignal) => Promise<LeaderboardView>;
  submit: (
    runId: string,
    username: string,
    score: RunScore,
    signal?: AbortSignal,
  ) => Promise<LeaderboardView>;
};

export type LeaderboardClientOptions = {
  serviceUrl: string;
  fetcher: typeof fetch;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
};
