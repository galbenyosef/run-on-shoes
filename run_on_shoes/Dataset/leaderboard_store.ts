import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';
import type {
  LeaderboardEntry,
  LeaderboardView,
  RankedEntry,
} from '../Types/leaderboard.ts';
import type {
  LeaderboardDatabase,
  StoredRun,
} from '../Types/leaderboard_server.ts';

const columns = `player_id AS playerId, run_id AS runId, username, time_ms AS timeMs,
  dodged, distance_mm AS distanceMm, ratio, submitted_at AS submittedAt`;

export async function registerRun(
  db: LeaderboardDatabase,
  playerId: string,
  runId: string,
  now: number,
) {
  await db.batch([
    db
      .prepare('DELETE FROM leaderboard_runs WHERE started_at < ?')
      .bind(now - 30 * 86400000),
    db
      .prepare(
        'INSERT INTO leaderboard_runs (run_id, player_id, started_at) VALUES (?, ?, ?) ON CONFLICT(run_id) DO NOTHING',
      )
      .bind(runId, playerId, now),
  ]);
  return db
    .prepare(
      'SELECT run_id, player_id, started_at, submitted_at FROM leaderboard_runs WHERE run_id = ? AND player_id = ?',
    )
    .bind(runId, playerId)
    .first<StoredRun>();
}

export function readStoredRun(
  db: LeaderboardDatabase,
  playerId: string,
  runId: string,
) {
  return db
    .prepare(
      'SELECT run_id, player_id, started_at, submitted_at FROM leaderboard_runs WHERE run_id = ? AND player_id = ?',
    )
    .bind(runId, playerId)
    .first<StoredRun>();
}

/** Atomic first-write-wins run submission and personal-best update. */
export async function saveScore(
  db: LeaderboardDatabase,
  entry: LeaderboardEntry,
) {
  await db.batch([
    db
      .prepare(`UPDATE leaderboard_runs SET username = ?, time_ms = ?, dodged = ?, distance_mm = ?, ratio = ?, submitted_at = ?
      WHERE run_id = ? AND player_id = ? AND submitted_at IS NULL`)
      .bind(
        entry.username,
        entry.timeMs,
        entry.dodged,
        entry.distanceMm,
        entry.ratio,
        entry.submittedAt,
        entry.runId,
        entry.playerId,
      ),
    db
      .prepare(`INSERT INTO leaderboard_scores (player_id, run_id, username, time_ms, dodged, distance_mm, ratio, submitted_at)
      SELECT player_id, run_id, username, time_ms, dodged, distance_mm, ratio, submitted_at FROM leaderboard_runs
      WHERE run_id = ? AND player_id = ? AND submitted_at IS NOT NULL
      ON CONFLICT(player_id) DO UPDATE SET run_id = excluded.run_id, username = excluded.username,
        time_ms = excluded.time_ms, dodged = excluded.dodged, distance_mm = excluded.distance_mm,
        ratio = excluded.ratio, submitted_at = excluded.submitted_at
      WHERE (excluded.time_ms, excluded.dodged, excluded.distance_mm) >
        (leaderboard_scores.time_ms, leaderboard_scores.dodged, leaderboard_scores.distance_mm)`)
      .bind(entry.runId, entry.playerId),
  ]);
}

export async function readLeaderboard(
  db: LeaderboardDatabase,
  playerId: string | null,
): Promise<LeaderboardView> {
  const result = await db.batch<RankedEntry & { total: number }>([
    db
      .prepare(`SELECT ${columns}, RANK() OVER (ORDER BY time_ms DESC, dodged DESC, distance_mm DESC) AS rank
      FROM leaderboard_scores ORDER BY time_ms DESC, dodged DESC, distance_mm DESC, submitted_at, player_id LIMIT ?`)
      .bind(LEADERBOARD_CONFIG.topCount),
    db
      .prepare(`SELECT ${columns}, 1 + (SELECT COUNT(*) FROM leaderboard_scores AS better
      WHERE (better.time_ms, better.dodged, better.distance_mm) > (own.time_ms, own.dodged, own.distance_mm)) AS rank
      FROM leaderboard_scores AS own WHERE player_id = ?`)
      .bind(playerId),
    db.prepare('SELECT COUNT(*) AS total FROM leaderboard_scores'),
  ]);
  return {
    top: result[0].results,
    personal: result[1].results[0] ?? null,
    totalPlayers: result[2].results[0].total,
  };
}

export async function exportLeaderboard(
  db: LeaderboardDatabase,
  cursor: string,
) {
  const rows = await db
    .prepare(
      `SELECT ${columns} FROM leaderboard_scores WHERE player_id > ? ORDER BY player_id LIMIT ?`,
    )
    .bind(cursor, LEADERBOARD_CONFIG.exportPageSize + 1)
    .all<LeaderboardEntry>();
  const entries = rows.results.slice(0, LEADERBOARD_CONFIG.exportPageSize);
  return {
    entries,
    nextCursor:
      rows.results.length > entries.length
        ? entries[entries.length - 1].playerId
        : null,
  };
}

export async function countRequest(
  db: LeaderboardDatabase,
  key: string,
  now: number,
) {
  const bucket = `${key}:${Math.floor(now / 60000)}`;
  const results = await db.batch<{ requests: number }>([
    db.prepare('DELETE FROM leaderboard_rates WHERE expires_at < ?').bind(now),
    db
      .prepare(`INSERT INTO leaderboard_rates (bucket, requests, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET requests = requests + 1`)
      .bind(bucket, now + 120000),
    db
      .prepare('SELECT requests FROM leaderboard_rates WHERE bucket = ?')
      .bind(bucket),
  ]);
  return results[2].results[0].requests;
}
