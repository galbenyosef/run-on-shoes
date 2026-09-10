import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const leaderboardRuns = sqliteTable(
  'leaderboard_runs',
  {
    runId: text('run_id').primaryKey(),
    playerId: text('player_id').notNull(),
    startedAt: integer('started_at').notNull(),
    submittedAt: text('submitted_at'),
    username: text('username'),
    timeMs: integer('time_ms'),
    dodged: integer('dodged'),
    distanceMm: integer('distance_mm'),
    ratio: integer('ratio'),
  },
  (table) => [index('idx_runs_started').on(table.startedAt)],
);

export const leaderboardScores = sqliteTable(
  'leaderboard_scores',
  {
    playerId: text('player_id').primaryKey(),
    runId: text('run_id').notNull(),
    username: text('username').notNull(),
    timeMs: integer('time_ms').notNull(),
    dodged: integer('dodged').notNull(),
    distanceMm: integer('distance_mm').notNull(),
    ratio: integer('ratio').notNull(),
    submittedAt: text('submitted_at').notNull(),
  },
  (table) => [
    index('idx_scores_ranking').on(
      table.timeMs,
      table.dodged,
      table.distanceMm,
    ),
  ],
);

export const leaderboardRates = sqliteTable(
  'leaderboard_rates',
  {
    bucket: text('bucket').primaryKey(),
    requests: integer('requests').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('idx_rates_expiration').on(table.expiresAt)],
);
