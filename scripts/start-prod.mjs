import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PUBLIC_PORT = process.env.PORT || '3000';

console.log(`🚀 Starting Wedding Platform (Full-Stack Next.js + PostgreSQL) on port ${PUBLIC_PORT}...`);

const webProc = spawn(
  process.execPath,
  [
    '--experimental-strip-types',
    path.join(rootDir, 'node_modules/next/dist/bin/next'),
    'start',
    '--port',
    String(PUBLIC_PORT),
  ],
  {
    cwd: path.join(rootDir, 'wedding-web'),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PUBLIC_PORT),
    },
  }
);

function shutdown() {
  webProc.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
