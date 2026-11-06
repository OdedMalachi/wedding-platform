import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const apiProc = spawn(
  process.execPath,
  ['--experimental-strip-types', '--watch', 'src/server.ts'],
  {
    cwd: path.join(rootDir, 'wedding-api'),
    stdio: 'inherit',
    env: { ...process.env, PORT: '4000' },
  }
);

const webProc = spawn(
  process.execPath,
  [path.join(rootDir, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--port', '3000'],
  {
    cwd: path.join(rootDir, 'wedding-web'),
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:4000' },
  }
);

function shutdown() {
  apiProc.kill('SIGTERM');
  webProc.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
