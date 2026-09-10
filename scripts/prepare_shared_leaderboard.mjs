import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] && resolve(process.argv[2]);
if (!target || target === source) throw new Error('Pass the shared service checkout path.');
const hosting = JSON.parse(await readFile(resolve(target, '.openai/hosting.json'), 'utf8'));
if (hosting.project_id !== 'appgprj_6aa17e85770481919de166e32e0e9db1')
  throw new Error('Target is not the existing shared leaderboard service.');

const files = [
  'Config/game.ts', 'Config/leaderboard.ts', 'Types/leaderboard.ts', 'Types/leaderboard_server.ts',
  'Method/leaderboard.ts', 'Method/leaderboard_validation.ts',
  'Method/leaderboard_server.ts', 'Method/leaderboard_client.ts',
  'Dataset/leaderboard_store.ts', 'Dataset/leaderboard_http.ts',
  'Module/leaderboard.ts', 'Module/leaderboard_server.ts',
  'API/leaderboard.ts', 'API/leaderboard_server.ts',
  'Demo/leaderboard_worker.ts',
  'Test/leaderboard.test.ts', 'Test/leaderboard_server.test.ts',
];
for (const file of files) {
  const destination = resolve(target, 'run_on_shoes', file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(source, 'run_on_shoes', file), destination);
}
// Retain the original migration as the isolated unit-test fixture. The shared
// database receives a newly generated migration after both schemas are merged.
await mkdir(resolve(target, 'run_on_shoes_migrations'), { recursive: true });
await cp(resolve(source, 'drizzle/0000_leaderboard.sql'), resolve(target, 'run_on_shoes_migrations/0000_leaderboard.sql'));
const testPath = resolve(target, 'run_on_shoes/Test/leaderboard_server.test.ts');
await writeFile(testPath, (await readFile(testPath, 'utf8')).replace('../../drizzle/0000_leaderboard.sql', '../../run_on_shoes_migrations/0000_leaderboard.sql'));
await cp(resolve(source, 'db/schema.ts'), resolve(target, 'db/microstride-schema.ts'));
const schemaPath = resolve(target, 'db/schema.ts');
const schema = await readFile(schemaPath, 'utf8');
const schemaExport = "export * from './microstride-schema.ts';";
if (!schema.includes(schemaExport)) await writeFile(schemaPath, `${schema}\n${schemaExport}\n`);

const routePath = resolve(target, 'app/microstride/[...path]/route.ts');
await mkdir(dirname(routePath), { recursive: true });
await writeFile(routePath, `import { env } from 'cloudflare:workers';
import { createLeaderboardWorker } from '../../../run_on_shoes/Demo/leaderboard_worker.ts';

// Framework adapter only: supply the host binding to the layered game service.
const worker = createLeaderboardWorker();
export function GET(request: Request) { return worker.fetch(request, { DB: env.DB }); }
export const POST = GET;
export const OPTIONS = GET;
`);
console.log('Shared service prepared. Generate and review a new migration, test both games, then build and deploy there.');
