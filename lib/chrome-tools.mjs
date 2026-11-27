import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ids = /^[a-z0-9_-]{1,128}$/i;
const busyTabs = new Set();
const supported = (url) => /^https?:\/\//i.test(url) || url === 'about:blank';
const codes = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
const unavailable = 'Chrome bağlantısı hazır değil. Chrome’da chrome://inspect/#remote-debugging sayfasından uzaktan hata ayıklamaya izin verip tekrar dene.';

async function discover() {
  try {
    const config = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'DevToolsActivePort');
    const port = (await readFile(config, 'utf8')).split(/\r?\n/)[0];
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error();
    const local = `http://127.0.0.1:${port}`;
    const request = async (endpoint) => {
      const response = await fetch(`${local}/json/${endpoint}`, { signal: AbortSignal.timeout(2000), redirect: 'error' });
      if (!response.ok) throw new Error();
      return response.json();
    };
    const [version, raw] = await Promise.all([request('version'), request('list')]);
    if (!/^Chrome\//.test(version.Browser)) throw new Error();
    const tabs = raw.filter((item) => item.type === 'page' && ids.test(item.id) && typeof item.url === 'string' && supported(item.url));
    return { port, tabs };
  } catch { throw new Error(unavailable); }
}

export async function chromeTabs() {
  const { tabs } = await discover();
  return tabs.map(({ id, title, url }) => ({ id, title: typeof title === 'string' ? title.slice(0, 170) : '', url: url.slice(0, 500) }));
}

export async function useChrome(id, input, signal) {
  if (!ids.test(id)) throw new Error('Geçersiz Chrome sekmesi.');
  if (busyTabs.has(id)) throw new Error('Bu Chrome sekmesinde başka bir ajan eylemi sürüyor.');
  busyTabs.add(id);
  let socket;
  let pending;
  let sequence = 0;
  const stop = () => { socket?.close(); };
  try {
    const { port, tabs } = await discover();
    if (!tabs.some((item) => item.id === id)) throw new Error('Bağlı Chrome sekmesi açık veya erişilebilir değil.');
    signal.throwIfAborted();
    socket = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${id}`);
    signal.addEventListener('abort', stop, { once: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome bağlantısı zamanında açılmadı.')), 5000);
      const fail = () => { clearTimeout(timer); reject(new Error('Chrome bağlantıya izin vermedi.')); };
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', fail, { once: true });
      socket.addEventListener('close', fail, { once: true });
    });
    socket.addEventListener('close', () => pending?.reject(new Error('Chrome sekmesi kapandı.')));
    socket.addEventListener('message', (event) => {
      const packet = JSON.parse(event.data);
      if (packet.id !== pending?.id) return;
      if (packet.error) pending.reject(new Error(packet.error.message));
      else pending.resolve(packet.result);
    });
    const command = (method, params = {}) => {
      signal.throwIfAborted();
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Chrome eylemi zaman aşımına uğradı.')), 7000);
        pending = { id, resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } };
        socket.send(JSON.stringify({ id, method, params }));
      }).finally(() => { pending = undefined; });
    };
    if (input.action === 'open') {
      const result = await command('Page.navigate', { url: input.url });
      if (result.errorText) throw new Error(result.errorText);
    }
    if (input.action === 'inspect' || input.action === 'click') {
      const { cssVisualViewport } = await command('Page.getLayoutMetrics');
      const { clientWidth: width, clientHeight: height } = cssVisualViewport;
      if (input.action === 'inspect') {
        const page = await command('Runtime.evaluate', { expression: '({ url: location.href, text: (document.body?.innerText ?? "").slice(0, 12000) })', returnByValue: true });
        if (!page.result.value || !supported(page.result.value.url)) throw new Error('Chrome sayfası okunamadı.');
        const picture = await command('Page.captureScreenshot', { format: 'jpeg', quality: 65, captureBeyondViewport: false });
        return { text: `${page.result.value.url} · ${width}×${height} CSS pixels\n${page.result.value.text}`, image: { mimeType: 'image/jpeg', data: picture.data } };
      }
      if (input.x >= width || input.y >= height) throw new Error('Koordinat Chrome görünümünün dışında.');
      for (const type of ['mousePressed', 'mouseReleased']) await command('Input.dispatchMouseEvent', { type, x: input.x, y: input.y, button: 'left', clickCount: 1 });
    }
    if (input.action === 'type') await command('Input.insertText', { text: input.text });
    if (input.action === 'press') for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', { type, key: input.key, code: input.key, windowsVirtualKeyCode: codes[input.key] });
    return { text: 'Chrome sekmesindeki eylem tamamlandı.' };
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
    busyTabs.delete(id);
  }
}
