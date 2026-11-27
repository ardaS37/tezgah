import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

function command(name) {
  if (process.platform !== 'win32') return [name];
  const directories = (process.env.PATH ?? '').split(path.delimiter).map((entry) => entry.replace(/^"|"$/g, '')).filter(Boolean);
  const { APPDATA, LOCALAPPDATA, USERPROFILE } = process.env;
  const locations = {
    claude: [APPDATA && path.join(APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin'), USERPROFILE && path.join(USERPROFILE, '.local', 'bin')],
    agy: [LOCALAPPDATA && path.join(LOCALAPPDATA, 'agy', 'bin')],
    codex: [LOCALAPPDATA && path.join(LOCALAPPDATA, 'Programs', 'OpenAI', 'Codex', 'bin')],
  };
  for (const directory of [...directories, ...(locations[name] ?? []).filter(Boolean)]) {
    const candidate = path.join(directory, `${name}.exe`);
    if (path.isAbsolute(candidate) && existsSync(candidate)) return [candidate];
  }
  const npmEntry = {
    codex: ['@openai', 'codex', 'bin', 'codex.js'],
    claude: ['@anthropic-ai', 'claude-code', 'cli.js'],
  }[name];
  if (npmEntry) {
    const npmDirectories = APPDATA ? [...directories, path.join(APPDATA, 'npm')] : directories;
    for (const directory of npmDirectories) {
      const script = path.join(directory, 'node_modules', ...npmEntry);
      if (path.isAbsolute(script) && existsSync(script)) return [process.execPath, script];
    }
  }
  return [`${name}.exe`];
}

export function cli(name, args, cwd) {
  const [file, ...prefix] = command(name);
  return spawn(file, [...prefix, ...args], { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
}

export function collect(child, { input, onLine, timeout = 0, signal } = {}) {
  return new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    const stop = () => {
      child.kill();
      child.stdout.destroy();
      child.stderr.destroy();
    };
    const timer = timeout && setTimeout(stop, timeout);
    signal?.addEventListener('abort', stop, { once: true });
    if (signal?.aborted) stop();
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout = (stdout + chunk).slice(-500_000); });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr = (stderr + chunk).slice(-24_000); });
    if (onLine) createInterface({ input: child.stdout }).on('line', onLine);
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.once('error', reject);
    child.once('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
      resolve({ code, stdout, stderr });
    });
  });
}

export class Rpc {
  constructor(child, { versioned = false, onMessage, onRequest } = {}) {
    this.child = child;
    this.versioned = versioned;
    this.pending = new Map();
    this.nextId = 0;
    this.closed = false;
    this.done = new Promise((resolve) => { this.finish = resolve; });
    const close = (error) => {
      if (this.closed) return;
      this.closed = true;
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
      this.finish(error);
    };
    child.on('error', close);
    child.on('exit', (code) => close(new Error(`Ajan işlemi kapandı (${code ?? 'durduruldu'}).`)));
    child.stdin.on('error', close);
    child.stderr.resume();
    createInterface({ input: child.stdout }).on('line', (line) => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.method && message.id != null) {
        Promise.resolve().then(() => onRequest?.(message)).then(
          (result) => this.send({ id: message.id, result: result ?? {} }),
          (error) => this.send({ id: message.id, error: { code: -32601, message: error.message } }),
        ).catch(() => {});
      } else if (message.method) {
        onMessage?.(message);
      } else if (this.pending.has(message.id)) {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message || 'Ajan isteği başarısız oldu.'));
        else entry.resolve(message.result);
      }
    });
  }

  send(message) {
    if (!this.closed && this.child.stdin.writable) {
      this.child.stdin.write(`${JSON.stringify(this.versioned ? { jsonrpc: '2.0', ...message } : message)}\n`);
    }
  }

  request(method, params, timeout = 20_000) {
    if (this.closed) return Promise.reject(new Error('Ajan bağlantısı kapandı.'));
    const id = ++this.nextId;
    let timer;
    return new Promise((resolve, reject) => {
      if (timeout) timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Ajan zamanında yanıt vermedi (${method}).`));
      }, timeout);
      this.pending.set(id, { resolve, reject });
      this.send({ id, method, params });
    }).finally(() => clearTimeout(timer));
  }

  stop() {
    if (this.stopping) return;
    this.stopping = true;
    const child = this.child;
    child.stdin.end();
    const timer = setTimeout(() => {
      child.kill();
      child.stdout.destroy();
      child.stderr.destroy();
    }, 400);
    timer.unref();
    child.once('close', () => clearTimeout(timer));
  }
}
