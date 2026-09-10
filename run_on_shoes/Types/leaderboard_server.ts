export interface SqlStatement {
  bind(...values: (string | number | null)[]): SqlStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface LeaderboardDatabase {
  prepare(sql: string): SqlStatement;
  batch<T>(statements: SqlStatement[]): Promise<{ results: T[] }[]>;
}

export type LeaderboardEnvironment = { DB: LeaderboardDatabase };

export type StoredRun = {
  run_id: string;
  player_id: string;
  started_at: number;
  submitted_at: string | null;
};
