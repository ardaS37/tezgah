import { createHash, randomUUID } from 'node:crypto';
import { constants, realpath as resolveLinks } from 'node:fs';
import { cp, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const maxFile = 750_000;
const ignored = new Set(['.git', 'node_modules', '.next', '.venv', '__pycache__', 'dist', 'coverage']);
const utf8 = new TextDecoder('utf-8', { fatal: true });
const revision = (bytes) => createHash('sha256').update(bytes).digest('hex');
const realpath = promisify(resolveLinks);

export function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export async function writeAtomic(target, content, mode = 0o600) {
  const temporary = path.join(path.dirname(target), `.eksen-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx', mode });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

function splitView({ agents, selectedId, viewMode, orchestration, queuedHandoffs, activeFile, rightPanel, ...settings }) {
  return { settings, workspace: { agents, selectedId, viewMode, orchestration, queuedHandoffs, activeFile, rightPanel } };
}

export async function openState(dataDir, exampleDir) {
  await mkdir(dataDir, { recursive: true });
  const demo = path.join(dataDir, 'mini-proje');
  try { await stat(demo); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await cp(exampleDir, demo, { recursive: true });
  }
  const filename = path.join(dataDir, 'workbench.json');
  let stored = {};
  try { stored = JSON.parse(await readFile(filename, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const first = { id: 'demo', root: await realpath(demo), name: 'mini-proje', initialFile: 'src/format.js' };
  const projects = new Map([[first.id, first], ...(stored.projects ?? []).filter((item) => item.id !== 'demo').map((item) => [item.id, item])]);
  const workspaces = new Map(Object.entries(stored.workspaces ?? {}).filter(([id]) => projects.has(id)));
  let view = stored.view ?? null;
  if (view) {
    const id = projects.has(view.editorProject) ? view.editorProject : first.id;
    const { settings, workspace } = splitView(view);
    if (Array.isArray(workspace.agents) && !workspaces.has(id)) workspaces.set(id, workspace);
    view = { ...settings, editorProject: id };
  }
  let lastWrite = Promise.resolve();
  const persist = () => {
    const snapshot = JSON.stringify({ projects: [...projects.values()], view, workspaces: Object.fromEntries(workspaces) });
    lastWrite = lastWrite.catch(() => {}).then(() => writeAtomic(filename, snapshot));
    return lastWrite;
  };
  return {
    snapshot: () => ({ projects: [...projects.values()], view: view ? { ...view, ...workspaces.get(view.editorProject) } : null }),
    workspace(id) {
      if (!projects.has(id)) throw failure('Proje bulunamadı.', 404);
      return workspaces.get(id) ?? null;
    },
    flush: () => lastWrite,
    project(id) {
      const project = projects.get(id);
      if (!project) throw failure('Proje bulunamadı.', 404);
      return project;
    },
    async add(root) {
      if (typeof root !== 'string' || !path.isAbsolute(root)) throw failure('Tam bir klasör yolu gir.');
      const resolved = await realpath(root);
      if (!(await stat(resolved)).isDirectory()) throw failure('Bir klasör seç.');
      const existing = [...projects.values()].find((project) => !path.relative(project.root, resolved));
      if (existing) return existing;
      const project = { id: randomUUID(), root: resolved, name: path.basename(resolved) || resolved };
      projects.set(project.id, project);
      await persist();
      return project;
    },
    async update(viewData) {
      if (!viewData || typeof viewData !== 'object' || Array.isArray(viewData)) throw failure('Geçersiz çalışma alanı ayarı.');
      const { settings, workspace } = splitView(viewData);
      const id = settings.editorProject ?? first.id;
      if (!projects.has(id)) throw failure('Proje bulunamadı.', 404);
      if (Array.isArray(workspace.agents)) workspaces.set(id, workspace);
      view = { ...settings, editorProject: id };
      await persist();
    },
  };
}

function relativeParts(file) {
  if (typeof file !== 'string' || file.length > 2048) throw failure('Geçersiz dosya yolu.');
  if (!file) return [];
  const parts = file.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || /[<>:"\\|?*\x00-\x1f]|[ .]$/.test(part) || ignored.has(part.toLowerCase()))) {
    throw failure('Geçersiz veya hariç tutulan dosya yolu.');
  }
  return parts;
}

export async function projectPath(project, file) {
  const target = await realpath(path.join(project.root, ...relativeParts(file)));
  const relative = path.relative(project.root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || relative.split(path.sep).some((part) => ignored.has(part.toLowerCase()))) {
    throw failure('Dosya proje klasörünün dışında.', 403);
  }
  return target;
}

export async function listFiles(project, directory) {
  const entries = await readdir(await projectPath(project, directory), { withFileTypes: true });
  return entries.filter((entry) => !ignored.has(entry.name.toLowerCase()) && !entry.name.startsWith('.eksen-') && (entry.isFile() || entry.isDirectory()))
    .map((entry) => ({ name: entry.name, file: directory ? `${directory}/${entry.name}` : entry.name, folder: entry.isDirectory() }))
    .sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name, 'tr'));
}

export async function searchFiles(project, query, locale = 'en') {
  const search = String(query || '').trim().toLocaleLowerCase(locale).slice(0, 120);
  if (!search) return { files: [] };
  const directories = [''];
  const files = [];
  for (let index = 0; index < directories.length && index < 1200 && files.length < 150; index++) {
    let entries;
    try { entries = await listFiles(project, directories[index]); }
    catch (error) { if (index === 0) throw error; continue; }
    for (const entry of entries) {
      if (entry.folder) directories.push(entry.file);
      else if (entry.file.toLocaleLowerCase(locale).includes(search)) files.push(entry.file);
      if (files.length === 150) break;
    }
  }
  return { files, truncated: files.length === 150 || directories.length > 1200 };
}

async function fileBytes(target) {
  const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > maxFile) throw failure('Editör en fazla 750 KB boyutunda metin dosyalarını açar.', 413);
    const bytes = Buffer.alloc(info.size + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > maxFile || bytesRead !== info.size) throw failure('Dosya okunurken değişti. Tekrar aç.', 409);
    return bytes.subarray(0, bytesRead);
  } finally { await handle.close(); }
}

export async function readText(project, file) {
  const raw = await fileBytes(await projectPath(project, file));
  let text;
  try {
    if (raw.includes(0)) throw new Error();
    text = utf8.decode(raw);
  } catch { throw failure('Bu dosya UTF-8 metni olarak açılamıyor.', 415); }
  return { text: text.replace(/\r\n/g, '\n'), revision: revision(raw), eol: text.includes('\r\n') ? 'CRLF' : 'LF' };
}

export async function saveText(project, file, text, expectedRevision) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > maxFile || text.includes('\0')) throw failure('Geçerli bir metin dosyası kaydet.', 413);
  const target = await projectPath(project, file);
  const [raw, info] = await Promise.all([fileBytes(target), stat(target)]);
  if (revision(raw) !== expectedRevision) throw failure('Dosya diskte değişti. Kendi düzenlemeni kopyalayıp dosyayı yeniden yükle.', 409);
  const eol = raw.includes('\r\n') ? 'CRLF' : 'LF';
  const bom = raw.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? '\uFEFF' : '';
  const output = Buffer.from(bom + (eol === 'CRLF' ? text.replace(/(?<!\r)\n/g, '\r\n') : text));
  if (output.length > maxFile) throw failure('Dosya 750 KB sınırını aşıyor.', 413);
  await writeAtomic(target, output, info.mode & 0o777);
  return { revision: revision(output), eol };
}

export async function createFile(project, file) {
  const parts = relativeParts(file);
  const name = parts.pop();
  if (!name || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) throw failure('Geçerli bir dosya adı gir.');
  const parent = await projectPath(project, parts.join('/'));
  await writeFile(path.join(parent, name), '', { flag: 'wx' });
  return { file };
}
