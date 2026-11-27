import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './server.mjs';

const local = await startServer();
const browsers = process.platform === 'win32' ? [
  [process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
  [process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
  [process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
  [process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'],
  [process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'],
] : [];
const browser = browsers.filter(([root]) => root).map((segments) => path.join(...segments)).find(existsSync);

console.log(`Tezgah hazır. ${local.url}`);
if (browser) {
  const tempRoot = path.resolve(os.tmpdir());
  const profile = await mkdtemp(path.join(tempRoot, 'tezgah-browser-'));
  const window = spawn(browser, [`--app=${local.url}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-mode', '--window-size=1500,940'], { windowsHide: true, stdio: 'ignore' });
  let cleaning = false;
  const cleanup = async () => {
    if (cleaning) return;
    cleaning = true;
    await local.close();
    if (path.dirname(profile) === tempRoot && path.basename(profile).startsWith('tezgah-browser-')) {
      await rm(profile, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  };
  window.once('error', (error) => console.error(`Masaüstü penceresi açılamadı. Yukarıdaki bağlantıyı kullan. ${error.message}`));
  window.once('exit', (code) => {
    if (code === 0) cleanup();
    else console.error('Masaüstü penceresi kapandı. Yukarıdaki bağlantıyı kullanabilirsin.');
  });
  process.once('SIGINT', () => { window.kill(); cleanup(); });
}
