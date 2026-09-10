import { mkdir, writeFile } from 'node:fs/promises';
import { LEADERBOARD_CONFIG } from '../run_on_shoes/Config/leaderboard.ts';
import {
  normalizeUsername,
  rankLeaderboard,
} from '../run_on_shoes/Method/leaderboard.ts';
import type { LeaderboardEntry } from '../run_on_shoes/Types/leaderboard.ts';

const entries: LeaderboardEntry[] = [];
const cursors = new Set<string>();
let cursor = '';
for (;;) {
  if (cursors.has(cursor)) throw new Error('Repeated leaderboard cursor');
  cursors.add(cursor);
  const url = new URL('/api/export', LEADERBOARD_CONFIG.serviceUrl);
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  });
  if (!response.ok)
    throw new Error(`Leaderboard export failed: HTTP ${response.status}`);
  const body = (await response.json()) as {
    entries: LeaderboardEntry[];
    nextCursor: string | null;
  };
  if (
    !Array.isArray(body.entries) ||
    body.entries.length > LEADERBOARD_CONFIG.exportPageSize
  )
    throw new Error('Invalid leaderboard export');
  for (const row of body.entries) {
    if (
      !row ||
      !/^[a-f0-9]{64}$/.test(row.playerId) ||
      normalizeUsername(row.username) !== row.username ||
      ![row.timeMs, row.dodged, row.distanceMm, row.ratio].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      !Number.isFinite(Date.parse(row.submittedAt)) ||
      typeof row.runId !== 'string'
    )
      throw new Error('Invalid score in export');
    // Explicitly select public fields; never mirror future private server fields.
    entries.push({
      playerId: row.playerId,
      username: row.username,
      runId: row.runId,
      timeMs: row.timeMs,
      dodged: row.dodged,
      distanceMm: row.distanceMm,
      ratio: row.ratio,
      submittedAt: row.submittedAt,
    });
  }
  if (body.nextCursor === null) break;
  if (
    typeof body.nextCursor !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.nextCursor)
  )
    throw new Error('Invalid export cursor');
  cursor = body.nextCursor;
  if (entries.length > 500000)
    throw new Error('Export exceeds mirror capacity');
}
entries.sort((a, b) => a.playerId.localeCompare(b.playerId));
if (new Set(entries.map((entry) => entry.playerId)).size !== entries.length)
  throw new Error('Duplicate players in export');
const updatedAt = entries.reduce<string | null>(
  (latest, entry) =>
    !latest || entry.submittedAt > latest ? entry.submittedAt : latest,
  null,
);
const top = rankLeaderboard(entries, null).top;
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, '\\$&');
const markdown = [
  '# MICROSTRIDE 用户排行榜',
  '',
  '[开始游戏](https://565353780.github.io/run-on-shoes/) · [完整成绩数据](scores.json)',
  '',
  '每位匿名玩家保留最好成绩。按生存时长、躲避次数、移动距离依次降序排列，完全同分并列。',
  '',
  '游戏内实时更新；此 GitHub 副本每 15 分钟尝试同步一次，也可手动运行同步工作流。',
  '',
  `当前 ${entries.length} 位玩家。最近成绩：${updatedAt ?? '暂无'}。`,
  '',
  '| 名次 | 用户名 | 生存时长 | 躲避次数 |',
  '| --- | --- | ---: | ---: |',
  ...top.map(
    (entry) =>
      `| ${entry.rank} | ${escape(entry.username)} | ${(entry.timeMs / 1000).toFixed(1)} 秒 | ${entry.dodged} |`,
  ),
  '',
  '昵称由玩家填写，可能重名。成绩来自浏览器游戏，适用于休闲排行。',
  '',
].join('\n');
await mkdir('leaderboard', { recursive: true });
await writeFile(
  'leaderboard/scores.json',
  JSON.stringify({ schemaVersion: 1, updatedAt, entries }, null, 2) + '\n',
);
await writeFile('leaderboard/README.md', markdown);
console.log(
  `Mirrored ${entries.length} players; most recent score: ${updatedAt ?? 'none'}.`,
);
