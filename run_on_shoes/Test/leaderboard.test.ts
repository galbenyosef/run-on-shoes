import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareScores,
  normalizeUsername,
  rankLeaderboard,
} from '../Method/leaderboard.ts';
import type { LeaderboardEntry } from '../Types/leaderboard.ts';

function entry(playerId: string, timeMs: number): LeaderboardEntry {
  return {
    playerId,
    username: `玩家 ${playerId}`,
    runId: `run-${playerId}-${timeMs}`,
    submittedAt: '2026-09-09T00:00:00.000Z',
    timeMs,
    dodged: 3,
    distanceMm: 1500,
    ratio: 100,
  };
}

void test('Leaderboard normalizes nicknames and rejects blank, oversized, and hidden controls', () => {
  assert.equal(normalizeUsername('  小明  Ａ  '), '小明 A');
  assert.throws(() => normalizeUsername(' \n '));
  assert.throws(() => normalizeUsername('鞋'.repeat(25)));
  assert.throws(() => normalizeUsername('玩家\u202e坏'));
});

void test('Leaderboard sorts by survival, dodges, then distance without mutating input', () => {
  const a = entry('a', 20000);
  const b = { ...entry('b', 20000), dodged: 4 };
  const c = { ...entry('c', 20000), dodged: 4, distanceMm: 1600 };
  const d = entry('d', 21000);
  const input = [a, b, c, d];
  assert.deepEqual(
    rankLeaderboard(input, null).top.map((e) => e.playerId),
    ['d', 'c', 'b', 'a'],
  );
  assert.deepEqual(input, [a, b, c, d]);
  assert.ok(compareScores(d, c) < 0);
});

void test('Top ten and personal rank are calculated over all players', () => {
  const input = Array.from({ length: 13 }, (_, i) =>
    entry(String(i), 13000 - i * 100),
  );
  const view = rankLeaderboard(input, '12');
  assert.equal(view.top.length, 10);
  assert.equal(view.totalPlayers, 13);
  assert.equal(view.personal?.rank, 13);
  assert.equal(rankLeaderboard(input, 'missing').personal, null);
});

void test('Repeated runs keep one personal best; equal scores share ranks', () => {
  const personalBest = entry('a', 30000);
  const view = rankLeaderboard(
    [
      personalBest,
      entry('a', 15000),
      { ...entry('a', 30000), submittedAt: '2026-09-10T00:00:00.000Z' },
      entry('b', 30000),
      entry('c', 10000),
    ],
    'a',
  );
  assert.equal(view.totalPlayers, 3);
  assert.equal(view.personal?.runId, personalBest.runId);
  assert.equal(view.personal?.submittedAt, personalBest.submittedAt);
  assert.deepEqual(
    view.top.map((e) => e.rank),
    [1, 1, 3],
  );
  assert.deepEqual(rankLeaderboard([], null), {
    top: [],
    personal: null,
    totalPlayers: 0,
  });
});
