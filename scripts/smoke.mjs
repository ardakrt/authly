import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cliPath = resolve('node_modules/electron-vite/bin/electron-vite.js');
const visual = process.argv.includes('--visual');
const screenshotDirectory = visual ? join(tmpdir(), `authapp-smoke-${process.pid}`) : undefined;
const child = spawn(process.execPath, [cliPath, 'preview'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    AUTHAPP_DISABLE_DEVTOOLS: '1',
    AUTHAPP_SMOKE_TEST: '1',
    ...(screenshotDirectory ? { AUTHAPP_SMOKE_SCREENSHOT_DIR: screenshotDirectory } : {}),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let stdout = '';
let stderr = '';
let timedOut = false;

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  stdout += chunk;
});
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

const timeout = setTimeout(() => {
  timedOut = true;
  child.kill();
}, 20_000);

child.on('error', (error) => {
  clearTimeout(timeout);
  console.error(`Electron smoke başlatılamadı: ${error.message}`);
  process.exitCode = 1;
});

child.on('close', (code) => {
  clearTimeout(timeout);
  const ready = stdout.includes('AUTHAPP_SMOKE_READY');

  if (timedOut || code !== 0 || !ready) {
    console.error('Electron smoke başarısız.');
    if (stdout.trim()) console.error(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
    return;
  }

  console.log('AUTHAPP_SMOKE_READY');
  if (screenshotDirectory) console.log(`AUTHAPP_SMOKE_SCREENSHOTS=${screenshotDirectory}`);
});
