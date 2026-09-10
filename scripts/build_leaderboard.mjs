import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('service-dist', { recursive: true, force: true });
await mkdir('service-dist/dist/server', { recursive: true });
await build({
  entryPoints: ['leaderboard_worker.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'service-dist/dist/server/index.js',
});
await cp('drizzle', 'service-dist/drizzle', { recursive: true });
console.log(
  'Leaderboard Worker and database migrations built in service-dist/.',
);
