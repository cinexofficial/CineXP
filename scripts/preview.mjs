import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, DATABASE_URL: '', TMDB_PREVIEW_ORIGIN: 'http://127.0.0.1:4011',
  CINEXP_DEMO_CATALOG: 'true', CATALOG_PORT: '4011', ADS_VERIFIED_PLACEMENTS: '', DISPLAY_ADS_ENABLED: 'true' };
const catalog = spawn(process.execPath, ['tests/catalog-server.mjs'], { cwd: root, env, stdio: 'inherit' });
const app = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000', '--webpack'], { cwd: root, env, stdio: 'inherit' });
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; catalog.kill(); app.kill(); process.exitCode = code; }
for (const child of [catalog, app]) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
console.log('CineXP design preview · demo catalog, house promotions, no production database');
