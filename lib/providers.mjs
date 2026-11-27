import { cli, collect, Rpc } from './process.mjs';
import { translate } from '../ui/i18n.js';

export const providers = {
  codex: { name: 'Codex', cli: 'codex', login: 'codex login' },
  claude: { name: 'Claude Code', cli: 'claude', login: 'claude auth login' },
  antigravity: { name: 'Antigravity', cli: 'agy', login: 'agy' },
};

const client = { name: 'eksen_workbench', title: 'Tezgah', version: '0.2.0' };
const reasoning = ['low', 'medium', 'high', 'xhigh', 'max'];
const catalogFallback = {
  codex: [{ id: '', name: 'Codex varsayılanı', efforts: reasoning.slice(0, 4), defaultEffort: 'medium' }],
  claude: ['sonnet', 'opus', 'haiku', 'fable'].map((id) => ({
    id, name: `Claude ${id[0].toUpperCase()}${id.slice(1)}`, efforts: reasoning, isDefault: id === 'sonnet',
  })),
  antigravity: [
    { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen', efforts: reasoning.slice(0, 4) },
    { id: 'gemini-4-carbon', name: 'Gemini 4 Carbon', efforts: reasoning.slice(0, 3) },
    { id: 'gemini-4-neon', name: 'Gemini 4 Neon', efforts: reasoning.slice(0, 4) },
  ],
};

function codexConnection(cwd, handlers, mcpUrl) {
  const args = ['app-server', '--listen', 'stdio://'];
  if (mcpUrl) args.push('-c', `mcp_servers.tezgah.url=${JSON.stringify(mcpUrl)}`, '-c', 'mcp_servers.tezgah.required=true');
  return new Rpc(cli('codex', args, cwd), handlers);
}

async function initializeCodex(rpc) {
  await rpc.request('initialize', { clientInfo: client, capabilities: { experimentalApi: true } });
  rpc.send({ method: 'initialized' });
}

function antigravityConnection(cwd, handlers, full = false, usesMcp = false) {
  const args = ['acp', full ? '--dangerously-skip-permissions' : '--sandbox'];
  if (usesMcp) args.push('--process-per-session');
  return new Rpc(cli('agy', args, cwd), { versioned: true, ...handlers });
}

async function initializeAntigravity(rpc) {
  const result = await rpc.request('initialize', { protocolVersion: 1, clientCapabilities: {}, clientInfo: client });
  if (result.protocolVersion !== 1) throw new Error('Antigravity ACP protokol sürümü desteklenmiyor.');
}

function acpOption(configs, category) {
  return configs.find((config) => config.category === category || config.id === category || (category === 'thought_level' && /effort|thinking/.test(config.id)));
}

function acpChoices(config) {
  return (config?.options ?? []).flatMap((option) => option.options ?? [option]);
}

function acpEffort(value) {
  const name = value.toLowerCase().replace(/[ -]+/g, '_');
  if (['extra', 'extra_high', 'very_high', 'x_high'].includes(name)) return 'xhigh';
  return name;
}

function parseAgyModels(stdout) {
  const models = new Map();
  for (const row of stdout.split(/\r?\n/)) {
    const match = row.trim().match(/^([\w.-]+)(?:\t+| {2,})(.+)$/);
    if (!match || !match[1].includes('-')) continue;
    const [, slug, display] = match;
    const suffix = slug.match(/-(low|medium|high|xhigh|max)$/);
    const id = suffix ? slug.slice(0, -suffix[0].length) : slug;
    const model = models.get(id) ?? { id, name: suffix ? display.replace(/\s+\([^()]+\)$/, '') : display, efforts: [] };
    if (suffix && !model.efforts.includes(suffix[1])) model.efforts.push(suffix[1]);
    models.set(id, model);
  }
  return [...models.values()].map((model) => ({ ...model, efforts: reasoning.filter((level) => model.efforts.includes(level)) }));
}

function statusError(error, provider) {
  const message = error.message ?? '';
  if (error.code === 'ENOENT') return { status: 'missing', hint: `${providers[provider].cli} bulunamadı.` };
  if (/authenticat|not logged in|login required|not signed in|sign in/i.test(message)) return { status: 'login', hint: 'CLI oturumu açılmalı.' };
  return { status: 'unknown', hint: 'Canlı sağlayıcı durumu doğrulanamadı.' };
}

async function claudeModels(cwd) {
  const args = ['--print', '--verbose', '--input-format', 'stream-json', '--output-format', 'stream-json', '--no-chrome', '--strict-mcp-config'];
  const input = `${JSON.stringify({ type: 'control_request', request_id: 'tezgah-catalog', request: { subtype: 'initialize' } })}\n`;
  const result = await collect(cli('claude', args, cwd), { input, timeout: 5500 });
  for (const line of result.stdout.split(/\r?\n/)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type !== 'control_response' || event.response?.request_id !== 'tezgah-catalog') continue;
    return (event.response.response?.models ?? []).filter((entry) => typeof entry.value === 'string' && typeof entry.displayName === 'string').map((entry) => ({
      id: entry.value === 'default' ? '' : entry.value,
      name: entry.value === 'default' ? 'Claude varsayılanı' : `Claude ${entry.displayName.replace(/^Claude /i, '')}`,
      efforts: entry.supportsEffort === false ? [] : (entry.supportedEffortLevels ?? reasoning),
      supportsAutoMode: entry.supportsAutoMode,
      isDefault: entry.value === 'default',
    }));
  }
  return [];
}

export async function getCatalog(provider, cwd) {
  const fallback = catalogFallback[provider];
  let rpc;
  try {
    if (provider === 'codex') {
      rpc = codexConnection(cwd);
      await initializeCodex(rpc);
      const [catalog, account] = await Promise.all([
        rpc.request('model/list', { limit: 100, includeHidden: false }, 10_000),
        rpc.request('account/read', { refreshToken: false }, 5000).catch(() => null),
      ]);
      const models = catalog.data.filter((model) => !model.hidden).map((model) => ({
        id: model.model, name: model.displayName, isDefault: model.isDefault,
        efforts: model.supportedReasoningEfforts.map((effort) => effort.reasoningEffort), defaultEffort: model.defaultReasoningEffort,
        supportsVision: !model.inputModalities || model.inputModalities.includes('image'),
      }));
      const status = account ? (account.account || !account.requiresOpenaiAuth ? 'ready' : 'login') : 'unknown';
      return { status, models: models.length ? models : fallback, source: models.length ? 'cli' : 'example' };
    }
    if (provider === 'claude') {
      const result = await collect(cli('claude', ['auth', 'status', '--json'], cwd), { timeout: 7000 });
      let account;
      try { account = JSON.parse(result.stdout); } catch { account = null; }
      const models = await claudeModels(cwd).catch(() => []);
      return { status: account?.loggedIn === true ? 'ready' : account?.loggedIn === false ? 'login' : 'unknown', models: models.length ? models : fallback, source: models.length ? 'cli' : 'aliases' };
    }
    const result = await collect(cli('agy', ['models'], cwd), { timeout: 10_000 });
    const models = parseAgyModels(result.stdout);
    if (result.code === 0 && models.length) return { status: 'ready', models, source: 'cli' };
    throw new Error(/not logged into Antigravity|authentication required/i.test(`${result.stdout}\n${result.stderr}`) ? 'not logged in' : 'Model list unavailable');
  } catch (error) {
    return { ...statusError(error, provider), models: fallback, source: provider === 'claude' ? 'aliases' : 'example' };
  } finally { rpc?.stop(); }
}

function authError(provider, message, locale) {
  const status = statusError(new Error(message), provider);
  if (status.status === 'login') return translate(locale, 'Terminalde {command} ile oturum açıp tekrar dene.', { command: providers[provider].login });
  return message.slice(0, 1800);
}

export async function runAgent(context) {
  const runners = { codex: runCodex, claude: runClaude, antigravity: runAntigravity };
  try { return await runners[context.provider](context); }
  catch (error) {
    if (context.signal.aborted) return 'cancelled';
    if (error.code === 'ENOENT') throw new Error(translate(context.locale, '{command} çalıştırılabilir dosyası bulunamadı.', { command: providers[context.provider].cli }));
    throw new Error(authError(context.provider, error.message, context.locale));
  }
}

async function runCodex({ cwd, prompt, model, effort, mode, resume, emit, ask, signal, settings, mcpUrl, image, goal, resumeGoal, locale }) {
  let threadId, turnId;
  let stopping;
  let awaitingContinuation;
  let goalStatus = '';
  let complete;
  const finished = new Promise((resolve) => { complete = resolve; });
  const seen = new Set();
  const rpc = codexConnection(cwd, {
    locale,
    onMessage({ method, params }) {
      if (params?.threadId !== threadId) return;
      if (method === 'turn/started') {
        const continuing = !!awaitingContinuation;
        clearTimeout(awaitingContinuation);
        awaitingContinuation = undefined;
        turnId = params.turn.id;
        if (continuing) emit('activity', { text: 'Codex hedef üzerinde çalışmaya devam ediyor' });
      }
      if (method === 'thread/goal/updated') {
        goalStatus = params.goal.status;
        emit('goal', { status: goalStatus });
      }
      if (method === 'thread/goal/cleared') {
        goalStatus = '';
        emit('goal', { status: '' });
      }
      if (method === 'item/agentMessage/delta' || method === 'item/plan/delta') {
        seen.add(params.itemId);
        emit('text', { text: params.delta, channel: method === 'item/plan/delta' ? 'plan' : 'answer', id: params.itemId });
      }
      if (method === 'turn/plan/updated') emit('plan', { steps: params.plan });
      if (method === 'item/completed') {
        const item = params.item;
        if ((item.type === 'agentMessage' || item.type === 'plan') && !seen.has(item.id) && item.text) {
          emit('text', { text: item.text, channel: item.type === 'plan' ? 'plan' : 'answer', id: item.id });
        }
        if (item.type === 'fileChange') emit('activity', { text: item.changes.map((change) => change.path).join(', '), refresh: true });
      }
      if (method === 'item/started') {
        const item = params.item;
        if (item.type === 'commandExecution') emit('activity', { text: item.command });
        if (item.type === 'fileChange') emit('activity', { text: 'Dosyalar düzenleniyor' });
      }
      if (method === 'turn/completed') {
        if (!goal || mode === 'plan' || goalStatus !== 'active' || params.turn.status !== 'completed' || signal.aborted) complete(params.turn);
        else awaitingContinuation = setTimeout(() => complete(params.turn), 1800);
      }
    },
    async onRequest({ method, params }) {
      if (method === 'item/commandExecution/requestApproval' || method === 'item/fileChange/requestApproval') {
        if (mode === 'plan' || signal.aborted || (params.availableDecisions && !params.availableDecisions.includes('accept'))) return { decision: 'decline' };
        const allowed = await ask({ title: method.includes('commandExecution') ? 'Komut çalıştırma izni' : 'Dosya değiştirme izni', detail: params.command || params.reason || '', kind: 'approval' });
        return { decision: allowed === true ? 'accept' : 'decline' };
      }
      if (method === 'item/tool/requestUserInput') {
        const answers = await ask({ kind: 'input', title: 'Codex bir yanıt bekliyor', questions: params.questions });
        return { answers: Object.fromEntries(Object.entries(answers || {}).map(([key, value]) => [key, { answers: [String(value)] }])) };
      }
      if (method === 'item/permissions/requestApproval') return { permissions: {}, scope: 'turn' };
      throw new Error('Bu ajan isteği desteklenmiyor.');
    },
  }, mcpUrl);
  const stop = () => {
    if (turnId) {
      if (goalStatus === 'active') rpc.request('thread/goal/set', { threadId, status: 'paused' }, 2000).catch(() => {});
      rpc.request('turn/interrupt', { threadId, turnId }, 2000).catch(() => rpc.stop());
      stopping = setTimeout(() => rpc.stop(), 4000);
    } else rpc.stop();
  };
  signal.addEventListener('abort', stop, { once: true });
  try {
    if (signal.aborted) return 'cancelled';
    await initializeCodex(rpc);
    const full = mode === 'code' && settings.permissions === 'full';
    const reviewer = mode === 'code' && settings.permissions === 'auto' ? 'auto_review' : 'user';
    const threadSettings = { cwd, model: model || undefined, sandbox: mode === 'plan' ? 'read-only' : full ? 'danger-full-access' : 'workspace-write', approvalPolicy: mode === 'plan' || full ? 'never' : 'on-request', approvalsReviewer: reviewer };
    const thread = resume
      ? await rpc.request('thread/resume', { ...threadSettings, threadId: resume })
      : await rpc.request('thread/start', threadSettings);
    threadId = thread.thread.id;
    emit('resume', { id: threadId });
    if (goal !== undefined) {
      const current = resume ? (await rpc.request('thread/goal/get', { threadId })).goal : null;
      if (goal && (current?.objective !== goal || resumeGoal)) {
        const result = await rpc.request('thread/goal/set', { threadId, objective: goal, status: mode === 'plan' ? 'paused' : 'active' });
        goalStatus = result.goal.status;
      } else if (!goal && current) await rpc.request('thread/goal/clear', { threadId });
      else goalStatus = current?.status || '';
      emit('goal', { status: goalStatus });
    }
    const selectedModel = model || thread.model;
    const input = [{ type: 'text', text: prompt, text_elements: [] }];
    if (image) input.push({ type: 'image', url: `data:image/png;base64,${image}` });
    const start = await rpc.request('turn/start', {
      threadId, cwd, input, approvalPolicy: threadSettings.approvalPolicy, approvalsReviewer: reviewer,
      sandboxPolicy: mode === 'plan' ? { type: 'readOnly', networkAccess: false } : full ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true },
      ...(selectedModel ? { collaborationMode: { mode: mode === 'plan' ? 'plan' : 'default', settings: { model: selectedModel, reasoning_effort: effort || null, developer_instructions: null } } } : { model: model || undefined, effort: effort || undefined }),
    });
    turnId = start.turn.id;
    const result = await Promise.race([finished, rpc.done.then((error) => { throw error; })]);
    if (result.status === 'failed') throw new Error(result.error?.message || 'Codex görevi tamamlayamadı.');
    return result.status === 'interrupted' || signal.aborted ? 'cancelled' : 'completed';
  } finally {
    clearTimeout(awaitingContinuation);
    clearTimeout(stopping);
    signal.removeEventListener('abort', stop);
    rpc.stop();
  }
}

async function runClaude({ cwd, prompt, model, effort, mode, resume, emit, signal, settings, mcpUrl, image, goal, locale }) {
  const permissionMode = mode === 'plan' ? 'plan' : { ask: 'manual', auto: 'auto', full: 'bypassPermissions' }[settings.permissions];
  const promptHost = !!mcpUrl && mode === 'code' && settings.permissions !== 'full';
  const args = ['--print', '--verbose', '--output-format', 'stream-json', '--include-partial-messages', '--permission-prompts', promptHost ? 'host' : 'none', '--permission-mode', permissionMode,
    settings.chrome ? '--chrome' : '--no-chrome', '--settings', JSON.stringify({ ultracode: settings.ultracode })];
  if (mcpUrl) args.push('--mcp-config', JSON.stringify({ mcpServers: { tezgah: { type: 'http', url: mcpUrl } } }));
  if (promptHost) args.push('--permission-prompt-tool', 'mcp__tezgah__permission');
  const allowed = [settings.browser && 'mcp__tezgah__browser', settings.computer && 'mcp__tezgah__computer'];
  if (settings.workers?.length) allowed.push('mcp__tezgah__list_workers', 'mcp__tezgah__run_workers', 'mcp__tezgah__wait_workers');
  if (mcpUrl && allowed.some(Boolean)) args.push('--allowedTools', allowed.filter(Boolean).join(','));
  if (model) args.push('--model', model);
  if (effort) args.push('--effort', effort);
  if (resume) args.push('--resume', resume);
  const text = goal ? translate(locale, 'Görev hedefi: {goal}\n\n{prompt}', { goal, prompt }) : prompt;
  let input = text;
  if (image) {
    args.push('--input-format', 'stream-json');
    input = `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: image } }] }, parent_tool_use_id: null, session_id: resume || '' })}\n`;
  }
  let errorText = '', partial = false, output = false, resultSeen = false;
  const result = await collect(cli('claude', args, cwd), {
    input, signal,
    onLine(line) {
      let event;
      try { event = JSON.parse(line); } catch { return; }
      if (event.type === 'system' && event.subtype === 'init') emit('resume', { id: event.session_id });
      if (event.type === 'stream_event' && !event.parent_tool_use_id) {
        if (event.event.type === 'message_start') partial = false;
        const delta = event.event.delta;
        if (delta?.type === 'text_delta') {
          partial = output = true;
          emit('text', { text: delta.text });
        }
      }
      if (event.type === 'assistant' && !event.parent_tool_use_id) {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'text' && !partial) { emit('text', { text: block.text }); output = true; }
          if (block.type === 'tool_use') emit('activity', { text: block.input?.command || block.input?.file_path || block.name, refresh: /Edit|Write/.test(block.name) });
        }
      }
      if (event.type === 'result') {
        resultSeen = true;
        if (event.is_error) errorText = event.errors?.join('\n') || event.result || 'Claude Code görevi tamamlayamadı.';
        else if (!output && event.result) emit('text', { text: event.result });
        if (event.permission_denials?.length) emit('activity', { text: translate(locale, '{count} araç isteği izin gerektirdiği için reddedildi.', { count: event.permission_denials.length }) });
      }
    },
  });
  if (signal.aborted) return 'cancelled';
  if (result.code !== 0 || errorText || !resultSeen) throw new Error(errorText || result.stderr.trim().split(/\r?\n/).slice(-3).join('\n') || 'Claude Code yanıt vermedi.');
  return 'completed';
}

async function runAntigravity({ cwd, prompt, model, effort, mode, resume, emit, ask, signal, settings, mcpUrl, image, goal, locale }) {
  let sessionId;
  const full = mode === 'code' && settings.permissions === 'full';
  const rpc = antigravityConnection(cwd, {
    locale,
    onMessage({ method, params }) {
      if (method !== 'session/update' || params.sessionId !== sessionId) return;
      const update = params.update;
      if (update.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') emit('text', { text: update.content.text });
      if (update.sessionUpdate === 'plan') emit('plan', { steps: update.entries.map((entry) => ({ step: entry.content, status: entry.status === 'in_progress' ? 'inProgress' : entry.status })) });
      if (update.sessionUpdate === 'tool_call') emit('activity', { text: update.title, refresh: update.kind === 'edit' });
      if (update.sessionUpdate === 'tool_call_update' && update.status === 'completed') emit('activity', { refresh: true });
    },
    async onRequest({ method, params }) {
      if (method !== 'session/request_permission') throw new Error('Bu ACP isteği desteklenmiyor.');
      if (mode === 'plan' || signal.aborted) return { outcome: { outcome: 'cancelled' } };
      const options = params.options.filter((option) => option.kind === 'allow_once' || option.kind === 'reject_once');
      const approve = options.find((option) => option.kind === 'allow_once');
      const deny = options.find((option) => option.kind === 'reject_once');
      const tool = params.toolCall;
      const detail = tool?.rawInput ? JSON.stringify(tool.rawInput, null, 2).slice(0, 4000) : '';
      const allow = approve && await ask({ kind: 'approval', title: tool?.title || 'Antigravity araç izni', detail });
      const selected = allow ? approve : deny;
      return { outcome: selected ? { outcome: 'selected', optionId: selected.optionId } : { outcome: 'cancelled' } };
    },
  }, full, !!mcpUrl);
  let stopping;
  const stop = () => {
    if (sessionId) rpc.send({ method: 'session/cancel', params: { sessionId } });
    stopping = setTimeout(() => rpc.stop(), 1500);
  };
  signal.addEventListener('abort', stop, { once: true });
  try {
    if (signal.aborted) return 'cancelled';
    await initializeAntigravity(rpc);
    const mcpServers = mcpUrl ? [{ type: 'http', name: 'tezgah', url: mcpUrl, headers: [] }] : [];
    const session = resume
      ? await rpc.request('session/resume', { sessionId: resume, cwd, mcpServers })
      : await rpc.request('session/new', { cwd, mcpServers });
    sessionId = session.sessionId || resume;
    if (!sessionId) throw new Error('Antigravity oturumu oluşturulamadı.');
    emit('resume', { id: sessionId });
    let configs = session.configOptions ?? [];
    const setOption = async (config, value) => {
      if (config.currentValue === value) return;
      const result = await rpc.request('session/set_config_option', { sessionId, configId: config.id, value });
      configs = result.configOptions ?? configs;
    };
    const modeConfig = acpOption(configs, 'mode');
    const requestedMode = mode === 'plan' ? 'plan' : settings.permissions === 'auto' ? 'auto' : 'default';
    if (modeConfig) await setOption(modeConfig, requestedMode);
    else await rpc.request('session/set_mode', { sessionId, modeId: requestedMode });
    if (model) {
      const modelConfig = acpOption(configs, 'model');
      const choices = modelConfig ? acpChoices(modelConfig) : (session.models?.availableModels ?? []).map((entry) => ({ value: entry.modelId, name: entry.name }));
      const lowerName = model.replaceAll('-', ' ').toLowerCase();
      const choice = choices.find((entry) => entry.value === model) || choices.find((entry) => entry.name?.toLowerCase() === lowerName) ||
        choices.find((entry) => effort && entry.value === `${model}-${effort}`) || choices.find((entry) => entry.value.startsWith(`${model}-`));
      if (modelConfig && !choice) throw new Error('Seçilen model Antigravity hesabındaki ACP seçenekleri arasında görünmüyor.');
      if (modelConfig) await setOption(modelConfig, choice.value);
      else await rpc.request('session/set_model', { sessionId, modelId: choice?.value || model });
    }
    if (effort) {
      const thought = acpOption(configs, 'thought_level');
      const value = acpChoices(thought).find((entry) => acpEffort(entry.value) === effort || acpEffort(entry.name ?? '') === effort)?.value;
      if (thought && value) await setOption(thought, value);
      else if (!acpChoices(acpOption(configs, 'model')).some((entry) => entry.value === `${model}-${effort}`)) throw new Error('Bu Antigravity modeli seçilen düşünme seviyesini sunmuyor.');
      else await setOption(acpOption(configs, 'model'), `${model}-${effort}`);
    }
    const content = [{ type: 'text', text: goal ? translate(locale, 'Görev hedefi: {goal}\n\n{prompt}', { goal, prompt }) : prompt }];
    if (image) content.push({ type: 'image', mimeType: 'image/png', data: image });
    const result = await rpc.request('session/prompt', { sessionId, prompt: content }, 0);
    if (signal.aborted || result.stopReason === 'cancelled') return 'cancelled';
    if (result.stopReason && result.stopReason !== 'end_turn') emit('activity', { text: translate(locale, 'Antigravity turu durdu ({reason})', { reason: result.stopReason }) });
    return 'completed';
  } finally {
    clearTimeout(stopping);
    signal.removeEventListener('abort', stop);
    rpc.stop();
  }
}
