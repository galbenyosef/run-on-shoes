import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { handleLeaderboardRequest } from '../API/leaderboard_server.ts';
import { createLeaderboardClient } from '../API/leaderboard.ts';
import { saveScore } from '../Dataset/leaderboard_store.ts';
import { hashPlayerToken } from '../Method/leaderboard_validation.ts';
import type {
  LeaderboardDatabase,
  SqlStatement,
} from '../Types/leaderboard_server.ts';
import type { LeaderboardView } from '../Types/leaderboard.ts';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new URL('../../drizzle/0000_leaderboard.sql', import.meta.url),
      'utf8',
    ),
  );
  function prepare(
    sql: string,
    values: (string | number | null)[] = [],
  ): SqlStatement {
    return {
      bind(...bound) {
        return prepare(sql, bound);
      },
      async first<T>() {
        return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null;
      },
      async all<T>() {
        return { results: sqlite.prepare(sql).all(...values) as T[] };
      },
      async run() {
        return sqlite.prepare(sql).run(...values);
      },
    };
  }
  const db: LeaderboardDatabase = {
    prepare,
    async batch<T>(statements: SqlStatement[]) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements)
          results.push(await statement.all<T>());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    request.headers.set('Origin', 'https://565353780.github.io');
    return handleLeaderboardRequest(request, { DB: db });
  };
  const send = (
    path: string,
    body?: unknown,
    token = 'a'.repeat(64),
    origin = 'https://565353780.github.io',
  ) =>
    handleLeaderboardRequest(
      new Request(`https://test.invalid${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Origin: origin,
          'X-Player-Token': token,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { DB: db },
    );
  return { db, sqlite, send, fetcher };
}

const score = {
  username: '小鞋子',
  timeMs: 13000,
  dodged: 3,
  distanceMm: 8000,
  ratio: 100,
};

void test('Real SQLite migrations support nickname submission, readback, immutable retries and personal best', async () => {
  const { sqlite, send } = database();
  try {
    const runId = crypto.randomUUID();
    assert.equal((await send('/api/runs', { runId })).status, 200);
    const started = sqlite
      .prepare('SELECT started_at FROM leaderboard_runs')
      .get()?.started_at;
    assert.equal((await send('/api/runs', { runId })).status, 200);
    assert.equal(
      sqlite.prepare('SELECT started_at FROM leaderboard_runs').get()
        ?.started_at,
      started,
    );
    const response = await send('/api/scores', { runId, ...score });
    assert.equal(response.status, 200);
    const view = (await response.json()) as LeaderboardView;
    assert.equal(view.personal?.rank, 1);
    assert.equal(view.personal?.username, '小鞋子');
    assert.equal(view.totalPlayers, 1);
    const retried = (await (
      await send('/api/scores', {
        runId,
        ...score,
        timeMs: 14900,
        username: 'changed',
      })
    ).json()) as LeaderboardView;
    assert.equal(retried.personal?.timeMs, 13000);
    assert.equal(retried.personal?.username, '小鞋子');
    const worseRun = crypto.randomUUID();
    await send('/api/runs', { runId: worseRun });
    await send('/api/scores', { runId: worseRun, ...score, timeMs: 1000 });
    const saved = (await (
      await send('/api/leaderboard')
    ).json()) as LeaderboardView;
    assert.equal(saved.personal?.timeMs, 13000);
    assert.equal(saved.totalPlayers, 1);
  } finally {
    sqlite.close();
  }
});

void test('SQL ranking agrees for top ten, ties and personal ranks outside the top ten', async () => {
  const { db, sqlite, send } = database();
  try {
    for (let i = 0; i < 13; i++) {
      const token = i.toString(16).padStart(64, '0');
      const runId = crypto.randomUUID();
      await send('/api/runs', { runId }, token);
      await saveScore(db, {
        ...score,
        username: `玩家${i}`,
        timeMs: i === 1 ? 13000 : 13000 - i * 100,
        runId,
        playerId: await hashPlayerToken(token),
        submittedAt: new Date().toISOString(),
      });
    }
    const result = (await (
      await send('/api/leaderboard', undefined, 'c'.padStart(64, '0'))
    ).json()) as LeaderboardView;
    assert.equal(result.top.length, 10);
    assert.deepEqual(
      result.top.slice(0, 3).map((entry) => entry.rank),
      [1, 1, 3],
    );
    assert.equal(result.personal?.rank, 13);
    assert.equal(result.totalPlayers, 13);
    const exported = (await (await send('/api/export')).json()) as {
      entries: unknown[];
      nextCursor: string | null;
    };
    assert.equal(exported.entries.length, 13);
    assert.equal(exported.nextCursor, null);
    assert.ok(!JSON.stringify(exported).includes('started_at'));
    assert.ok(!JSON.stringify(exported).includes('token'));
  } finally {
    sqlite.close();
  }
});

void test('Service rejects forged ownership, impossible scores, unsafe origins, bad JSON and oversized bodies', async () => {
  const { sqlite, send, db } = database();
  try {
    const runId = crypto.randomUUID();
    await send('/api/runs', { runId });
    assert.equal(
      (await send('/api/scores', { runId, ...score }, 'b'.repeat(64))).status,
      409,
    );
    assert.equal(
      (await send('/api/scores', { runId, ...score, timeMs: 100000 })).status,
      400,
    );
    assert.equal(
      (await send('/api/scores', { runId, ...score, timeMs: -1 })).status,
      400,
    );
    assert.equal(
      (await send('/api/scores', { runId, ...score, ratio: 21 })).status,
      400,
    );
    assert.equal(
      (await send('/api/scores', { runId, ...score, username: '   ' })).status,
      400,
    );
    assert.equal(
      (
        await send(
          '/api/scores',
          { runId, ...score },
          'a'.repeat(64),
          'https://attacker.invalid',
        )
      ).status,
      403,
    );
    assert.equal((await send('/api/runs', { runId }, 'bad-token')).status, 401);
    assert.equal(
      (await send('/api/runs', { runId, payload: 'x'.repeat(5000) })).status,
      413,
    );
    const badJson = new Request('https://test.invalid/api/runs', {
      method: 'POST',
      headers: {
        Origin: 'https://565353780.github.io',
        'X-Player-Token': 'a'.repeat(64),
        'Content-Type': 'application/json',
      },
      body: '{',
    });
    assert.equal(
      (await handleLeaderboardRequest(badJson, { DB: db })).status,
      400,
    );
    assert.equal(
      sqlite.prepare('SELECT COUNT(*) AS total FROM leaderboard_scores').get()
        ?.total,
      0,
    );
    const preflight = await handleLeaderboardRequest(
      new Request('https://test.invalid/api/scores', {
        method: 'OPTIONS',
        headers: { Origin: 'https://565353780.github.io' },
      }),
      { DB: db },
    );
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get('Access-Control-Allow-Origin'),
      'https://565353780.github.io',
    );
  } finally {
    sqlite.close();
  }
});

void test('HTTP client persists anonymous identity, remembers nickname and reads the same server record after reload', async () => {
  const { sqlite, fetcher } = database();
  try {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const client = createLeaderboardClient({
      fetcher,
      serviceUrl: 'https://test.invalid',
      storage,
    });
    const runId = crypto.randomUUID();
    await client.start(runId);
    const view = await client.submit(runId, '  微步玩家  ', score);
    assert.equal(view.personal?.username, '微步玩家');
    assert.equal(client.initialUsername, '微步玩家');
    const reloaded = createLeaderboardClient({
      fetcher,
      serviceUrl: 'https://test.invalid',
      storage,
    });
    assert.equal(reloaded.initialUsername, '微步玩家');
    assert.equal(
      (await reloaded.read()).personal?.playerId,
      view.personal?.playerId,
    );
    const anonymous = createLeaderboardClient({
      fetcher,
      serviceUrl: 'https://test.invalid',
      storage: null,
    });
    const other = await anonymous.read();
    assert.equal(other.top[0].username, '微步玩家');
    assert.equal(other.personal, null);
  } finally {
    sqlite.close();
  }
});

void test('Storage failure and rate limit return explicit failure without claiming a saved score', async () => {
  const { sqlite, send, db } = database();
  try {
    for (let i = 0; i < 60; i++)
      assert.equal(
        (await send('/api/runs', { runId: crypto.randomUUID() })).status,
        200,
      );
    assert.equal(
      (await send('/api/runs', { runId: crypto.randomUUID() })).status,
      429,
    );
    sqlite.exec('DROP TABLE leaderboard_scores');
    const response = await handleLeaderboardRequest(
      new Request('https://test.invalid/api/leaderboard'),
      { DB: db },
    );
    assert.equal(response.status, 503);
    assert.match(
      ((await response.json()) as { error: string }).error,
      /暂时不可用/,
    );
  } finally {
    sqlite.close();
  }
});
