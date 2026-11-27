import { spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { app, BrowserWindow } from 'electron';
import { collect } from './process.mjs';
import { chromeTabs, useChrome } from './chrome-tools.mjs';
import { translate } from '../ui/i18n.js';

const keys = { Enter: 'Enter', Escape: 'Escape', Tab: 'Tab', Backspace: 'Backspace', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };

export function createDesktopTools(owner) {
  const browsers = new Map();
  let computerActive = false;
  const allowed = (url) => /^https?:\/\//i.test(url);
  const browser = (id, locale) => {
    if (browsers.has(id)) return browsers.get(id);
    const window = new BrowserWindow({ title: translate(locale, 'Konsey · Tarayıcı aracı'), width: 1050, height: 770, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, partition: `tezgah-browser-${id}` } });
    const contents = window.webContents;
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.session.setPermissionCheckHandler(() => false);
    contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    contents.session.on('will-download', (event) => event.preventDefault());
    contents.on('will-frame-navigate', (event) => { if (!allowed(event.url)) event.preventDefault(); });
    contents.on('will-redirect', (event) => { if (!allowed(event.url)) event.preventDefault(); });
    window.on('page-title-updated', (event) => event.preventDefault());
    contents.on('did-navigate', (_event, url) => { if (allowed(url)) window.setTitle(`Konsey · ${new URL(url).hostname}`); });
    window.on('closed', () => browsers.delete(id));
    browsers.set(id, window);
    return window;
  };
  return {
    close() { for (const window of browsers.values()) window.destroy(); },
    handlers: {
      async browser(input, { id, signal, chromeTab, locale }) {
        signal.throwIfAborted();
        if (chromeTab) return useChrome(chromeTab, input, signal);
        const window = browser(id, locale);
        const contents = window.webContents;
        if (input.action === 'open') {
          const stop = () => { if (!window.isDestroyed()) contents.stop(); };
          signal.addEventListener('abort', stop, { once: true });
          const timer = setTimeout(stop, 20_000);
          try { await window.loadURL(input.url); }
          finally { clearTimeout(timer); signal.removeEventListener('abort', stop); }
        }
        if (input.action === 'click') {
          const [width, height] = window.getContentSize();
          if (input.x >= width || input.y >= height) throw new Error('Koordinat tarayıcı penceresinin dışında.');
          const point = { x: input.x, y: input.y, button: 'left', clickCount: 1 };
          contents.sendInputEvent({ ...point, type: 'mouseDown' });
          contents.sendInputEvent({ ...point, type: 'mouseUp' });
        }
        if (input.action === 'type') contents.insertText(input.text);
        if (input.action === 'press') for (const type of ['keyDown', 'keyUp']) contents.sendInputEvent({ type, keyCode: keys[input.key] });
        if (input.action === 'inspect') {
          const visible = await contents.executeJavaScript('String(document.body?.innerText || "").slice(0, 12000)');
          const shot = await contents.capturePage();
          const [width, height] = window.getContentSize();
          return { text: `${contents.getURL()} · ${width}×${height} CSS pixels\n${visible}`, image: { mimeType: 'image/jpeg', data: shot.toJPEG(72).toString('base64') } };
        }
        return { text: contents.getURL() || 'Browser ready.' };
      },
      ...(process.platform === 'win32' ? { chromeTabs, async computer(input, { signal }) {
        if (computerActive) throw new Error('Başka bir ajan bilgisayar aracını kullanıyor.');
        computerActive = true;
        const main = owner();
        const restore = main?.isVisible();
        try {
          if (restore) main.hide();
          await delay(220, undefined, { signal });
          const script = path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'assets', 'computer-use.ps1');
          const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-File', script], { windowsHide: true });
          const result = await collect(child, { input: JSON.stringify(input), timeout: 8000, signal });
          signal.throwIfAborted();
          if (result.code !== 0) throw new Error(result.stderr.trim().split(/\r?\n/).at(-1) || 'Windows eylemi tamamlanamadı.');
          const output = JSON.parse(result.stdout);
          return { text: output.text, image: output.image ? { mimeType: 'image/jpeg', data: output.image } : undefined };
        } finally {
          if (restore && !main.isDestroyed()) main.showInactive();
          computerActive = false;
        }
      } } : {}),
    },
  };
}
