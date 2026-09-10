export const LEADERBOARD_CONFIG = Object.freeze({
  usernameMaxLength: 24,
  topCount: 10,
  serviceUrl: 'https://aperture-flight-leaderboard.fluffy-bud-2038.chatgpt.site/microstride/',
  routePrefix: '/microstride',
  tokenStorageKey: 'microstride-player-token-v1',
  nameStorageKey: 'microstride-player-name-v1',
  requestTimeoutMs: 15000,
  maxRunMs: 12 * 60 * 60 * 1000,
  clockToleranceMs: 15000,
  maxBodyBytes: 4096,
  requestsPerMinute: 60,
  exportPageSize: 500,
});

export const LEADERBOARD_ORIGINS = Object.freeze([
  'https://565353780.github.io',
  new URL(LEADERBOARD_CONFIG.serviceUrl).origin,
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
]);
