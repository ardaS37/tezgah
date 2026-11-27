import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './lib/process.mjs';
import { getCatalog, providers, runAgent } from './lib/providers.mjs';
import { createFile, failure, listFiles, openState, readText, saveText } from './lib/workspaces.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const localDataRoot = process.env.LOCALAPPDATA || os.homedir();
const dataPath = path.join(localDataRoot, 'Tezgah');
const legacyDataPath = path.join(localDataRoot, 'Eksen');
export const defaultDataDir = process.env.TEZGAH_DATA_DIR || process.env.EKSEN_DATA_DIR ||
  (!existsSync(dataPath) && existsSync(legacyDataPath) ? legacyDataPath : dataPath);
const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/editor.js': ['editor.js', 'text/javascript; charset=utf-8'],
  '/logo.svg': ['logo.svg', 'image/svg+xml'],
};

function json(response, value, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function parseBody(request, limit = 1_600_000) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') throw failure('JSON istek gövdesi gerekiyor.', 415);
  if (Number(request.headers['content-length']) > limit) throw failure('İstek boyutu sınırı aşıldı.', 413);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw failure('İstek boyutu sınırı aşıldı.', 413);
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch { throw failure('Geçersiz istek gövdesi.'); }
}

let picking = false;
async function pickFolder() {
  if (process.platform !== 'win32') throw failure('Klasör yolunu elle gir.');
  if (picking) throw failure('Klasör seçici zaten açık.', 409);
  picking = true;
  try {
    const script = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Add-Type -AssemblyName System.Windows.Forms; $owner = New-Object System.Windows.Forms.Form; $owner.ShowInTaskbar = $false; $owner.Opacity = 0; $owner.TopMost = $true; $owner.Show(); $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = "Tezgah - Proje klasoru sec"; $dialog.ShowNewFolderButton = $false; if ($dialog.ShowDialog($owner) -eq "OK") { [Console]::Write($dialog.SelectedPath) }; $dialog.Dispose(); $owner.Dispose()';
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-STA', '-Command', script], { windowsHide: true });
    const result = await collect(child, { timeout: 180_000 });
    if (result.code !== 0) throw failure('Klasör seçici açılamadı. Klasör yolunu elle girebilirsin.');
    return result.stdout.trim();
  } finally { picking = false; }
}

function publicError(error) {
  if (error.status) return [error.status, error.message];
  if (error.code === 'ENOENT') return [404, 'Klasör veya dosya diskte bulunamadı.'];
  if (error.code === 'EEXIST') return [409, 'Bu isimde bir dosya zaten var.'];
  if (['EACCES', 'EPERM'].includes(error.code)) return [403, 'Klasöre veya dosyaya erişim izni yok.'];
  if (error.code === 'ENOTDIR') return [400, 'Geçerli bir klasör seç.'];
  console.error(error);
  return [500, 'Yerel işlem başarısız oldu.'];
}

export async function startServer({ dataDir = defaultDataDir, port = 0, runner = runAgent, catalog = getCatalog } = {}) {
  const state = await openState(dataDir, path.join(here, 'example'));
  const token = randomBytes(32).toString('hex');
  const active = new Map();
  const catalogCache = new Map();
  const saving = new Set();
  let host, origin;

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const route = url.pathname;
    const method = request.method;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (request.headers.host !== host || (request.headers.origin && request.headers.origin !== origin)) throw failure('Bu yerel adres kullanılamıyor.', 403);
      if (!route.startsWith('/api/')) {
        const asset = Object.hasOwn(staticFiles, route) && staticFiles[route];
        if (method !== 'GET' || !asset) throw failure('Sayfa bulunamadı.', 404);
        const [file, contentType] = asset;
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(await readFile(path.join(here, 'ui', file)));
        return;
      }
      if (request.headers['x-tezgah-token'] !== token) throw failure('Tezgah’ı başlangıç bağlantısından aç.', 403);
      const query = url.searchParams;
      if (route === '/api/state' && method === 'GET') return json(response, state.snapshot());
      if (route === '/api/state' && method === 'PUT') {
        await state.update(await parseBody(request, 6_000_000));
        return json(response, { saved: true });
      }
      if (route === '/api/project' && method === 'POST') {
        const body = await parseBody(request);
        const root = body.browse ? await pickFolder() : body.root;
        return json(response, { project: root ? await state.add(root) : null });
      }
      if (route === '/api/tree' && method === 'GET') {
        return json(response, await listFiles(state.project(query.get('project')), query.get('directory') || ''));
      }
      if (route === '/api/file' && method === 'GET') {
        return json(response, await readText(state.project(query.get('project')), query.get('file')));
      }
      if (route === '/api/file' && method === 'PUT') {
        const { project, file, text, revision } = await parseBody(request, 5_000_000);
        const key = `${project}:${process.platform === 'win32' ? String(file).toLowerCase() : file}`;
        if (saving.has(key)) throw failure('Bu dosya zaten kaydediliyor.', 409);
        saving.add(key);
        try { return json(response, await saveText(state.project(project), file, text, revision)); }
        finally { saving.delete(key); }
      }
      if (route === '/api/file' && method === 'POST') {
        const { project, file } = await parseBody(request);
        return json(response, await createFile(state.project(project), file), 201);
      }
      if (route === '/api/catalog' && method === 'GET') {
        const provider = query.get('provider');
        if (!Object.hasOwn(providers, provider)) throw failure('Geçersiz sağlayıcı.');
        if (!catalogCache.has(provider) || query.get('refresh') === '1') {
          catalogCache.set(provider, catalog(provider, state.project('demo').root));
        }
        return json(response, await catalogCache.get(provider));
      }
      if (route === '/api/turn/cancel' && method === 'POST') {
        const { id } = await parseBody(request);
        active.get(id)?.abort();
        return json(response, { ok: true });
      }
      if (route === '/api/turn/reply' && method === 'POST') {
        const { id, requestId, value } = await parseBody(request);
        const reply = active.get(id)?.approvals.get(requestId);
        if (!reply) throw failure('Ajan artık bu yanıtı beklemiyor.', 404);
        reply(value);
        return json(response, { ok: true });
      }
      if (route === '/api/turn' && method === 'POST') {
        const { id, provider, project, prompt, model, effort, mode, resume } = await parseBody(request);
        if (!/^[\w-]{1,100}$/.test(id) || !Object.hasOwn(providers, provider) || typeof prompt !== 'string' || !prompt.trim() || prompt.length > 110_000 ||
            typeof model !== 'string' || model.length > 300 || typeof effort !== 'string' || !/^(|none|minimal|low|medium|high|xhigh|max)$/.test(effort) ||
            !['plan', 'code'].includes(mode) || (resume && (typeof resume !== 'string' || !/^[\w.-]{1,200}$/.test(resume)))) throw failure('Geçersiz ajan ayarı veya mesaj.');
        if (active.has(id)) throw failure('Bu ajan zaten çalışıyor.', 409);
        if (active.size >= 12) throw failure('Aynı anda en fazla 12 ajan çalışabilir.', 409);
        const cwd = state.project(project).root;
        const controller = new AbortController();
        const approvals = new Map();
        const abort = () => {
          controller.abort();
          for (const reply of approvals.values()) reply(false);
        };
        active.set(id, { abort, approvals });
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
        response.flushHeaders();
        response.on('close', abort);
        const ping = setInterval(() => { if (!response.destroyed) response.write('\n'); }, 15_000);
        const emit = (type, payload) => { if (!response.destroyed) response.write(`${JSON.stringify({ type, ...payload })}\n`); };
        const ask = (details) => new Promise((resolve) => {
          if (controller.signal.aborted) { resolve(false); return; }
          const requestId = randomUUID();
          approvals.set(requestId, (value) => { approvals.delete(requestId); resolve(value); });
          emit('approval', { requestId, ...details });
        });
        try {
          const status = await runner({ cwd, provider, prompt, model, effort, mode, resume, emit, ask, signal: controller.signal });
          emit('done', { status });
        } catch (error) {
          emit('error', { message: error.message });
        } finally {
          clearInterval(ping);
          active.delete(id);
          for (const reply of approvals.values()) reply(false);
          response.end();
        }
        return;
      }
      throw failure('İstek bulunamadı.', 404);
    } catch (error) {
      const [status, message] = publicError(error);
      if (!response.headersSent) json(response, { error: message }, status);
      else response.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  host = `127.0.0.1:${server.address().port}`;
  origin = `http://${host}`;
  return {
    server, url: `${origin}/#${token}`,
    async close() {
      for (const entry of active.values()) entry.abort();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const local = await startServer();
  console.log(`Tezgah hazır. ${local.url}`);
}
