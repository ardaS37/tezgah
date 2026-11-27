import { translate } from '../ui/i18n.js';

const definitions = {
  browser: {
    title: 'Tarayıcı kullanımı',
    description: 'Work in the selected Chrome tab or a separate Konsey browser window. Inspect returns visible text and a screenshot. Use CSS pixel coordinates for clicks.',
    actions: ['open', 'inspect', 'click', 'type', 'press'],
  },
  computer: {
    title: 'Bilgisayar kullanımı',
    description: 'Inspect the Windows primary display and interact with the foreground app. Click coordinates correspond to the returned image. Each action requires user approval.',
    actions: ['inspect', 'click', 'type', 'press'],
  },
};

const text = (value) => ({ content: [{ type: 'text', text: value }] });
const toolFailure = (value) => ({ ...text(value), isError: true });
const keys = ['Enter', 'Escape', 'Tab', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function actionInput(name, raw) {
  const { action, x, y, text, key, url } = raw ?? {};
  if (!definitions[name].actions.includes(action)) throw new Error('Geçersiz araç eylemi.');
  if (action === 'open') {
    const target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Bir HTTP veya HTTPS adresi gir.');
    return { action, url: target.href };
  }
  if (action === 'click') {
    if (![x, y].every((value) => Number.isInteger(value) && value >= 0 && value <= 8000)) throw new Error('Geçersiz ekran koordinatı.');
    return { action, x, y };
  }
  if (action === 'type') {
    if (typeof text !== 'string' || !text.length || text.length > 1800 || /[\x00-\x1f]/.test(text)) throw new Error('Araç en fazla 1.800 karakterlik, tek satır metin alır.');
    return { action, text };
  }
  if (action === 'press') {
    if (!keys.includes(key)) throw new Error('Bu tuş desteklenmiyor.');
    return { action, key };
  }
  return { action };
}

export function createAgentTools({ options, desktopTools, ask, delegate, signal, permissionPrompt, id, locale }) {
  const actions = Object.entries(definitions).filter(([name]) => options[name] && desktopTools[name]);
  const tools = actions.map(([name, info]) => ({
    name, title: translate(locale, info.title), description: info.description,
    inputSchema: {
      type: 'object', required: ['action'],
      properties: { action: { type: 'string', enum: info.actions }, x: { type: 'integer' }, y: { type: 'integer' }, text: { type: 'string' }, url: { type: 'string' }, key: { type: 'string', enum: keys } },
    },
  }));
  if (permissionPrompt) tools.push({
    name: 'permission', description: 'Internal permission prompt for the Claude Code host. Do not call this directly.',
    inputSchema: { type: 'object', properties: { tool_name: { type: 'string' }, input: { type: 'object' } }, required: ['tool_name', 'input'] },
  });
  const workers = options.workers ?? [];
  const eligible = new Set(workers.map((worker) => worker.id));
  if (eligible.size) tools.push(
    { name: 'list_workers', description: 'List the agents selected by the user for this orchestration turn. Each worker has its own project and model.', inputSchema: { type: 'object' } },
    {
      name: 'run_workers', description: 'Start a batch of independent tasks on selected workers. Use the worker IDs from list_workers. Write one self-contained prompt per worker. Use wait_workers to collect the results before replying to the user.',
      inputSchema: {
        type: 'object', required: ['tasks'],
        properties: {
          tasks: {
            type: 'array', maxItems: eligible.size,
            items: {
              type: 'object', required: ['worker_id', 'prompt'],
              properties: { worker_id: { type: 'string' }, prompt: { type: 'string', maxLength: 8000 } },
            },
          },
        },
      },
    },
    { name: 'wait_workers', description: 'Wait briefly for this turn’s worker tasks and return their current states and completed results. If a task is still running, keep working or call this tool again before giving the final response.', inputSchema: { type: 'object' } },
  );
  if (!tools.length) return null;
  let operating = false;
  let dispatching = false;

  async function call(name, args) {
    if (eligible.size && name === 'list_workers' && !signal.aborted) return text(JSON.stringify(workers));
    if (eligible.size && name === 'wait_workers' && !signal.aborted) {
      const results = await delegate({ operation: 'wait' });
      return Array.isArray(results) ? text(JSON.stringify(results)) : toolFailure('The worker wait was cancelled.');
    }
    if (eligible.size && name === 'run_workers' && !signal.aborted) {
      const tasks = args?.tasks;
      if (dispatching) return toolFailure('A worker batch is already running.');
      if (!Array.isArray(tasks) || !tasks.length || tasks.length > eligible.size || new Set(tasks.map((task) => task?.worker_id)).size !== tasks.length ||
          tasks.some((task) => !eligible.has(task?.worker_id) || typeof task.prompt !== 'string' || !task.prompt.trim() || task.prompt.length > 8000)) {
        return toolFailure('Provide one nonempty task per selected worker ID from list_workers.');
      }
      dispatching = true;
      try {
        const results = await delegate({ operation: 'start', tasks: tasks.map(({ worker_id, prompt }) => ({ id: worker_id, prompt: prompt.trim() })) });
        return Array.isArray(results) ? text(JSON.stringify(results)) : toolFailure('The worker batch was cancelled.');
      } finally { dispatching = false; }
    }
    if (permissionPrompt && name === 'permission') {
      const tool = args?.tool_name ?? args?.toolName;
      const input = args?.input ?? args?.tool_input ?? {};
      if (typeof tool !== 'string' || !tool || signal.aborted) return text(JSON.stringify({ behavior: 'deny', message: 'Permission request unavailable.' }));
      const allowed = await ask({ kind: 'approval', title: `Claude Code · ${tool}`, detail: JSON.stringify(input, null, 2).slice(0, 6000) });
      return text(JSON.stringify(allowed === true && !signal.aborted ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'Declined in Konsey.' }));
    }
    if (!actions.some(([action]) => action === name) || signal.aborted) return toolFailure(translate(locale, 'Araç bu turda kapalı.'));
    if (operating) return toolFailure(translate(locale, 'Bir araç eylemi zaten bekliyor.'));
    operating = true;
    try {
      const input = actionInput(name, args);
      const allowed = await ask({ kind: 'approval', title: definitions[name].title, detail: JSON.stringify(input, null, 2) });
      if (allowed !== true || signal.aborted) return toolFailure(translate(locale, 'Kullanıcı eylemi onaylamadı.'));
      const result = await desktopTools[name](input, { id, signal, chromeTab: options.chromeTab, locale });
      const response = text(translate(locale, result.text));
      if (result.image) response.content.push({ type: 'image', mimeType: result.image.mimeType, data: result.image.data });
      return response;
    } catch (error) { return toolFailure(translate(locale, error.message)); }
    finally { operating = false; }
  }

  return async ({ id, method, params, jsonrpc }) => {
    if (jsonrpc !== '2.0' || typeof method !== 'string') return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid request' } };
    if (id == null) return null;
    const respond = (result) => ({ jsonrpc: '2.0', id, result });
    if (method === 'initialize') return respond({ protocolVersion: ['2025-03-26', '2025-06-18', '2025-11-25', '2024-11-05'].includes(params?.protocolVersion) ? params.protocolVersion : '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'tezgah', version: '1.0.0' } });
    if (method === 'ping') return respond({});
    if (method === 'tools/list') return respond({ tools });
    if (method === 'tools/call') return respond(await call(params?.name, params?.arguments));
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
  };
}
