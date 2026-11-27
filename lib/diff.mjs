import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { collect } from './process.mjs';
import { failure, readText } from './workspaces.mjs';

function gitBinary() {
  const installed = process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Git', 'cmd', 'git.exe');
  return process.platform === 'win32' && installed && existsSync(installed) ? installed : 'git';
}

function git(root, args) {
  return collect(spawn(gitBinary(), ['--no-pager', '--no-optional-locks', '--literal-pathspecs', '-c', 'core.fsmonitor=false', '-C', root, ...args], { windowsHide: true }), { timeout: 8000 });
}

export async function changes(project) {
  const [status, prefix] = await Promise.all([
    git(project.root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.']),
    git(project.root, ['rev-parse', '--show-prefix']),
  ]);
  if (status.code !== 0 || prefix.code !== 0) {
    if (/not a git repository/i.test(status.stderr + prefix.stderr)) return { repository: false, files: [] };
    throw failure('Git çalışma durumu okunamadı.');
  }
  if (status.stdout.length >= 500_000) throw failure('Projedeki değişiklik listesi gösterim sınırını aşıyor.', 413);
  const offset = prefix.stdout.replace(/\r?\n$/, '');
  const output = status.stdout.split('\0');
  const files = [];
  for (let index = 0; index < output.length && files.length < 700; index++) {
    const row = output[index];
    const state = row.slice(0, 2);
    const filename = row.slice(3);
    const source = /[RC]/.test(state) ? output[++index] : undefined;
    if (filename && filename.startsWith(offset)) files.push({ path: filename.slice(offset.length), oldPath: source?.startsWith(offset) ? source.slice(offset.length) : undefined, status: state });
  }
  return { repository: true, files, truncated: files.length === 700 };
}

export async function fileDiff(project, name) {
  const { files } = await changes(project);
  const selected = files.find((entry) => entry.path === name);
  if (!selected) throw failure('Bu dosya için Git değişikliği bulunamadı.', 404);
  if (selected.status === '??') {
    try {
      const { text } = await readText(project, selected.path);
      const lines = text ? text.split('\n') : [];
      if (lines.at(-1) === '') lines.pop();
      return { ...selected, diff: [`--- /dev/null`, `+++ b/${name}`, `@@ -0,0 +1,${lines.length} @@`, ...lines.map((line) => `+${line}`)].join('\n').slice(0, 250_000), truncated: text.length > 220_000 };
    } catch (error) {
      if (error.status === 415 || error.status === 413) return { ...selected, diff: 'Bu yeni dosya metin diff’i olarak gösterilemiyor.' };
      throw error;
    }
  }
  const paths = [selected.path, ...(selected.oldPath ? [selected.oldPath] : [])];
  const opts = ['--no-ext-diff', '--no-textconv', '--no-color', '--find-renames'];
  const hasHead = (await git(project.root, ['rev-parse', '--verify', 'HEAD'])).code === 0;
  const results = hasHead
    ? [await git(project.root, ['diff', ...opts, 'HEAD', '--', ...paths])]
    : await Promise.all([git(project.root, ['diff', ...opts, '--cached', '--', ...paths]), git(project.root, ['diff', ...opts, '--', ...paths])]);
  if (results.some((result) => result.code !== 0)) throw failure('Git diff alınamadı.');
  if (results.some((result) => result.stdout.length >= 500_000)) return { ...selected, diff: 'Diff görüntüleme sınırını aşıyor.', truncated: true };
  const diff = results.map((result) => result.stdout).filter(Boolean).join('\n');
  return { ...selected, diff: diff.slice(0, 250_000), truncated: diff.length > 250_000 };
}
