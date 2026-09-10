import { LEADERBOARD_CONFIG } from '../Config/leaderboard.ts';
import type {
  LeaderboardEntry,
  LeaderboardView,
  RunScore,
} from '../Types/leaderboard.ts';

/** Normalize a displayed nickname; identity is stored separately. No side effects. */
export function normalizeUsername(value: string): string {
  const username = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!username) throw new Error('请输入用户名，或选择跳过。');
  const length = Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
      username,
    ),
  ).length;
  if (length > LEADERBOARD_CONFIG.usernameMaxLength)
    throw new Error(
      `用户名最多 ${LEADERBOARD_CONFIG.usernameMaxLength} 个字符。`,
    );
  if (/[\p{Cc}\p{Cf}]/u.test(username))
    throw new Error('用户名不能包含不可见控制字符。');
  return username;
}

/** Negative means left ranks higher. Equal scores share a competition rank. */
export function compareScores(left: RunScore, right: RunScore): number {
  return (
    right.timeMs - left.timeMs ||
    right.dodged - left.dodged ||
    right.distanceMm - left.distanceMm
  );
}

/** Each player keeps their best run; equal runs keep the earliest submission. */
export function rankLeaderboard(
  entries: readonly LeaderboardEntry[],
  playerId: string | null,
): LeaderboardView {
  const best = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const previous = best.get(entry.playerId);
    if (
      !previous ||
      compareScores(entry, previous) < 0 ||
      (compareScores(entry, previous) === 0 &&
        entry.submittedAt < previous.submittedAt)
    )
      best.set(entry.playerId, entry);
  }
  const ordered = [...best.values()].sort(
    (left, right) =>
      compareScores(left, right) ||
      left.submittedAt.localeCompare(right.submittedAt) ||
      left.playerId.localeCompare(right.playerId),
  );
  let rank = 0;
  const ranked = ordered.map((entry, index) => {
    if (index === 0 || compareScores(entry, ordered[index - 1]) !== 0)
      rank = index + 1;
    return { ...entry, rank };
  });
  return {
    top: ranked.slice(0, LEADERBOARD_CONFIG.topCount),
    personal: ranked.find((entry) => entry.playerId === playerId) ?? null,
    totalPlayers: ranked.length,
  };
}
