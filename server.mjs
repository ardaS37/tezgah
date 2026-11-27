import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { collect } from './lib/process.mjs';
import { changes, fileDiff } from './lib/diff.mjs';
import { createAgentTools } from './lib/agent-tools.mjs';
import { getCatalog, providers, runAgent } from './lib/providers.mjs';
import { createFile, failure, listFiles, openState, readText, saveText, searchFiles } from './lib/workspaces.mjs';
import { normalizeLocale, translate } from './ui/i18n.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const localDataRoot = process.env.LOCALAPPDATA || os.homedir();
const dataPath = path.join(localDataRoot, 'Konsey');
const legacyDataPaths = ['Tezgah', 'Eksen'].map((name) => path.join(localDataRoot, name));
export const defaultDataDir = process.env.KONSEY_DATA_DIR || process.env.TEZGAH_DATA_DIR || process.env.EKSEN_DATA_DIR ||
  [dataPath, ...legacyDataPaths].find((candidate) => existsSync(candidate)) || dataPath;
const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/themes.css': ['themes.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/editor.js': ['editor.js', 'text/javascript; charset=utf-8'],
  '/i18n.js': ['i18n.js', 'text/javascript; charset=utf-8'],
  '/inspector.js': ['inspector.js', 'text/javascript; charset=utf-8'],
  '/logo.png': ['logo.png', 'image/png'],
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
async function pickFolder(locale) {
  if (process.platform !== 'win32') throw failure('Klasör yolunu elle gir.');
  if (picking) throw failure('Klasör seçici zaten açık.', 409);
  picking = true;
  try {
    const script = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); Add-Type -AssemblyName System.Windows.Forms; $owner = New-Object System.Windows.Forms.Form; $owner.ShowInTaskbar = $false; $owner.Opacity = 0; $owner.TopMost = $true; $owner.Show(); $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = $env:TEZGAH_PICKER_TITLE; $dialog.ShowNewFolderButton = $false; if ($dialog.ShowDialog($owner) -eq "OK") { [Console]::Write($dialog.SelectedPath) }; $dialog.Dispose(); $owner.Dispose()';
    const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-STA', '-Command', script], {
      windowsHide: true,
      env: { ...process.env, TEZGAH_PICKER_TITLE: translate(locale, 'Konsey · Proje klasörü aç') },
    });
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

export async function startServer({
  dataDir = defaultDataDir, exampleDir = path.join(here, 'example'), port = 0,
  runner = runAgent, catalog = getCatalog, folderPicker = pickFolder, desktopTools = {}, preview,
} = {}) {
  const state = await openState(dataDir, exampleDir);
  const token = randomBytes(32).toString('hex');
  const active = new Map();
  const catalogCache = new Map();
  const saving = new Set();
  const mcp = new Map();
  let host, origin;
  const getLocale = () => normalizeLocale(state.snapshot().view?.locale);

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const route = url.pathname;
    const method = request.method;
    const locale = normalizeLocale(request.headers['x-tezgah-locale'] ?? getLocale());
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (request.headers.host !== host || (request.headers.origin && request.headers.origin !== origin)) throw failure('Bu yerel adres kullanılamıyor.', 403);
      if (route.startsWith('/mcp/')) {
        const endpoint = mcp.get(route);
        if (!endpoint || request.headers.origin) throw failure('Araç oturumu bulunamadı.', 404);
        if (method !== 'POST') { response.writeHead(405, { Allow: 'POST' }); response.end(); return; }
        const result = await endpoint(await parseBody(request));
        if (result) return json(response, result);
        response.writeHead(202);
        response.end();
        return;
      }
      if (!route.startsWith('/api/')) {
        const asset = Object.hasOwn(staticFiles, route) && staticFiles[route];
        if (method !== 'GET' || !asset) throw failure('Sayfa bulunamadı.', 404);
        const [file, contentType] = asset;
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(await readFile(path.join(here, 'ui', file)));
        return;
      }
      if (request.headers['x-tezgah-token'] !== token) throw failure('Konsey’i başlangıç bağlantısından aç.', 403);
      const query = url.searchParams;
      if (route === '/api/state' && method === 'GET') return json(response, { ...state.snapshot(), tools: Object.keys(desktopTools), preview: !!preview });
      if (route === '/api/workspace' && method === 'GET') return json(response, { workspace: state.workspace(query.get('project')) });
      if (route === '/api/changes' && method === 'GET') return json(response, await changes(state.project(query.get('project'))));
      if (route === '/api/diff' && method === 'GET') return json(response, await fileDiff(state.project(query.get('project')), query.get('file')));
      if (route === '/api/preview' && preview) {
        if (method === 'GET') return json(response, preview.state());
        if (method === 'POST') {
          try { return json(response, await preview.act(await parseBody(request, 15_000))); }
          catch (error) { throw failure(error.message); }
        }
      }
      if (route === '/api/browser/tabs' && method === 'GET') {
        if (!desktopTools.chromeTabs) throw failure('Chrome sekmeleri Electron penceresinde bağlanabilir.');
        try { return json(response, await desktopTools.chromeTabs()); }
        catch (error) { throw failure(error.message); }
      }
      if (route === '/api/state' && method === 'PUT') {
        await state.update(await parseBody(request, 6_000_000));
        return json(response, { saved: true });
      }
      if (route === '/api/project' && method === 'POST') {
        const body = await parseBody(request);
        const root = body.browse ? await folderPicker(locale) : body.root;
        return json(response, { project: root ? await state.add(root) : null });
      }
      if (route === '/api/tree' && method === 'GET') {
        return json(response, await listFiles(state.project(query.get('project')), query.get('directory') || ''));
      }
      if (route === '/api/files/search' && method === 'GET') return json(response, await searchFiles(state.project(query.get('project')), query.get('q'), locale));
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
        const { id, provider, project, prompt, model, effort, mode, resume, options, image, goal, resumeGoal } = await parseBody(request);
        if (!/^[\w-]{1,100}$/.test(id) || !Object.hasOwn(providers, provider) || typeof prompt !== 'string' || !prompt.trim() || prompt.length > 110_000 ||
            typeof model !== 'string' || model.length > 300 || typeof effort !== 'string' || !/^(|none|minimal|low|medium|high|xhigh|max)$/.test(effort) ||
            !['plan', 'code'].includes(mode) || (resume && (typeof resume !== 'string' || !/^[\w.-]{1,200}$/.test(resume)))) throw failure('Geçersiz ajan ayarı veya mesaj.');
        if ((image && (typeof image !== 'string' || image.length > 1_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image))) ||
            (goal !== undefined && (typeof goal !== 'string' || goal.length > 4000))) throw failure('Geçersiz çizim veya görev hedefi.');
        const permissions = ['ask', 'auto', 'full'].includes(options?.permissions) ? options.permissions : 'ask';
        const team = [];
        const workerIds = new Set([id]);
        if (Array.isArray(options?.workers)) for (const worker of options.workers.slice(0, 7)) {
          if (!worker || typeof worker.id !== 'string' || !/^[\w-]{1,100}$/.test(worker.id) || workerIds.has(worker.id) || !Object.hasOwn(providers, worker.provider) || typeof worker.name !== 'string') continue;
          const assigned = state.project(worker.project);
          team.push({ id: worker.id, name: worker.name.slice(0, 65), provider: providers[worker.provider].name, project: assigned.name, model: typeof worker.model === 'string' ? worker.model.slice(0, 150) : '' });
          workerIds.add(worker.id);
        }
        const settings = {
          permissions, ultracode: provider === 'claude' && options?.ultracode === true,
          fastMode: (provider === 'codex' || provider === 'claude') && options?.fastMode === true,
          browser: mode === 'code' && options?.browser === true,
          computer: mode === 'code' && options?.computer === true,
          chrome: mode === 'code' && provider === 'claude' && options?.chrome === true,
          chromeTab: mode === 'code' && typeof options?.chromeTab === 'string' && /^[a-z0-9_-]{1,128}$/i.test(options.chromeTab) ? options.chromeTab : '',
          workers: team,
        };
        if (active.has(id)) throw failure('Bu ajan zaten çalışıyor.', 409);
        if (active.size >= 12) throw failure('Aynı anda en fazla 12 ajan çalışabilir.', 409);
        const cwd = state.project(project).root;
        const controller = new AbortController();
        const approvals = new Map();
        let settle;
        const done = new Promise((resolve) => { settle = resolve; });
        const abort = () => {
          controller.abort();
          for (const reply of approvals.values()) reply(false);
        };
        active.set(id, { abort, approvals, done });
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
        response.flushHeaders();
        response.on('close', abort);
        const ping = setInterval(() => { if (!response.destroyed) response.write('\n'); }, 15_000);
        const emit = (type, payload) => { if (!response.destroyed) response.write(`${JSON.stringify({ type, ...payload })}\n`); };
        const awaitReply = (type, details) => new Promise((resolve) => {
          if (controller.signal.aborted) { resolve(false); return; }
          const requestId = randomUUID();
          approvals.set(requestId, (value) => { approvals.delete(requestId); resolve(value); });
          emit(type, { requestId, ...details });
        });
        const ask = (details) => awaitReply('approval', details);
        const delegate = (details) => awaitReply('delegate', details);
        const mcpRoute = `/mcp/${randomBytes(32).toString('hex')}`;
        const endpoint = createAgentTools({ options: settings, desktopTools, ask, delegate, signal: controller.signal, id, locale, permissionPrompt: provider === 'claude' && mode === 'code' && permissions !== 'full' });
        if (endpoint) mcp.set(mcpRoute, endpoint);
        try {
          const status = await runner({ cwd, provider, prompt, model, effort, mode, resume, emit, ask, signal: controller.signal, settings, image, goal, resumeGoal: resumeGoal === true, locale, mcpUrl: endpoint ? `${origin}${mcpRoute}` : '' });
          emit('done', { status });
        } catch (error) {
          emit('error', { message: translate(locale, error.message) });
        } finally {
          clearInterval(ping);
          active.delete(id);
          mcp.delete(mcpRoute);
          for (const reply of approvals.values()) reply(false);
          response.end();
          settle();
        }
        return;
      }
      throw failure('İstek bulunamadı.', 404);
    } catch (error) {
      const [status, message] = publicError(error);
      if (!response.headersSent) json(response, { error: translate(locale, message) }, status);
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
    server, url: `${origin}/#${token}`, getLocale,
    async close() {
      const turns = [...active.values()];
      for (const entry of turns) entry.abort();
      const stopped = new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
      await Promise.all([stopped, state.flush().catch(() => {}), Promise.race([
        Promise.all(turns.map(({ done }) => done)), delay(5000, null, { ref: false }),
      ])]);
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const local = await startServer();
  console.log(translate(local.getLocale(), 'Konsey hazır. {url}', { url: local.url }));
}
