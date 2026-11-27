import { bindEditor, language } from './editor.js';
import { bindInspector } from './inspector.js';
import { getLocale, localizePage, setLocale, t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>', check: '<path d="m5 12 4 4L19 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>', corner: '<path d="M6 17 17 6M8 6h9v9"/>',
  folder: '<path d="M3 7.4V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  file: '<path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h4"/>',
  filePlus: '<path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h4m-9 7h5m-2.5-2.5v5"/>',
  markdown: '<path d="M4 5h16v14H4zM7 15V9l3 3 3-3v6m3-2 2 2m0 0 2-2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m-4-12h2m-2 4h2"/>',
  single: '<rect x="4" y="5" width="16" height="14" rx="2"/>', split: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>',
  chat: '<path d="M20 11a7 7 0 0 1-7 7H9l-5 3 1-5a7 7 0 0 1 4-12h4a7 7 0 0 1 7 7Z"/><path d="M9 11h.01m3 0h.01m3 0h.01"/>',
  refresh: '<path d="M20 7v5h-5m-1-7a7 7 0 1 0 6 8m0-1a7 7 0 0 0-6-7"/>',
  save: '<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 0v6h9V3M7 21v-7h10v7"/>',
  settings: '<path d="M9 4 8 6 6 6l-2 3 1 2v2l-1 2 2 3h2l1 2h5l1-2h2l2-3-1-2v-2l1-2-2-3h-2l-1-2Z"/><circle cx="11.5" cy="12" r="2.5"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  sparkle: '<path d="M12 2c.2 6.8 3.2 9.8 10 10-6.8.2-9.8 3.2-10 10-.2-6.8-3.2-9.8-10-10 6.8-.2 9.8-3.2 10-10Z"/>',
  codex: '<path d="M12 3a4 4 0 0 1 4 3 4 4 0 0 1 3 6 4 4 0 0 1-3 6 4 4 0 0 1-8 0 4 4 0 0 1-3-6 4 4 0 0 1 3-6 4 4 0 0 1 4-3Z"/><path d="m12 8 3.5 2v4L12 16l-3.5-2v-4Z"/>',
  claude: '<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5m-11-2 8 18M3 16l18-8"/>',
  antigravity: '<path d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Z" fill="currentColor" stroke="none"/>',
  checklist: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="m7 9 1 1 2-2m3 1h4m-10 6 1 1 2-2m3 1h4"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
  clip: '<path d="m9 15 6-6a2 2 0 0 1 3 3l-8 8a4 4 0 0 1-6-6l9-9a5 5 0 0 1 7 7l-8 8"/>',
  handoff: '<path d="M4 7h14m-4-4 4 4-4 4m6 6H6m4-4-4 4 4 4"/>',
  shield: '<path d="M12 3c3 2 6 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6c2 0 5-1 8-3Z"/><path d="m9 12 2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  draw: '<path d="m15 5 4 4M4 20l2-5L17 4a2.1 2.1 0 0 1 3 3L9 18Z"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  square: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="12" r="7"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 7v10m0-4h6a6 6 0 0 0 6-5"/>',
};

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ class: 'icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  svg.innerHTML = paths[name] ?? paths.file;
  return svg;
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter((child) => child != null));
  return node;
}
function button(className, title, ...children) {
  const node = el('button', className, ...children);
  node.type = 'button';
  if (title) { node.title = title; node.setAttribute('aria-label', title); }
  return node;
}
function option(value, name) { const node = el('option', '', name); node.value = value; return node; }
function providerIcon(id) { return el('span', `provider-icon ${id}`, icon(id)); }

const token = location.hash.slice(1) || sessionStorage.getItem('tezgah-token') || '';
if (location.hash && token) {
  sessionStorage.setItem('tezgah-token', token);
  history.replaceState(null, '', location.pathname);
}
const providers = {
  codex: { name: 'Codex', login: 'codex login' },
  claude: { name: 'Claude Code', login: 'claude auth login' },
  antigravity: { name: 'Antigravity', login: 'agy' },
};
const effortLabels = { '': 'Otomatik', none: 'Yok', minimal: 'Asgari', low: 'Düşük', medium: 'Orta', high: 'Yüksek', xhigh: 'Çok yüksek', max: 'En yüksek' };
const statusLabels = { ready: 'CLI bağlı', login: 'Oturum açılmalı', missing: 'CLI bulunamadı', unknown: 'Durum doğrulanamadı', loading: 'Kontrol ediliyor' };
const approvalLabels = { ask: 'Onay iste', auto: 'Benim için onayla', full: 'Tam erişim' };
const goalLabels = { active: 'Etkin', paused: 'Duraklatıldı', blocked: 'Beklemede', complete: 'Tamamlandı', usageLimited: 'Kullanım sınırı', budgetLimited: 'Bütçe sınırı' };
const maxPanels = 8;
const modelProfiles = new Map();
const palettes = { dark: 'True Dark', konsey: 'Konsey', darcula: 'Darcula', dracula: 'Dracula', nord: 'Nord', graphite: 'Grafit', amber: 'Kehribar', blue: 'Gece mavisi', green: 'Fosfor' };
let appearance = { mode: 'terminal', palettes: { terminal: 'dark', standard: 'graphite' } };
let availableTools = [];
const catalogs = {};
const tabs = new Map();
const layouts = new Map();
const busy = new Map();
const queuedHandoffs = new Map();
const orchestration = { leaderId: '', workerIds: [], jobs: [] };
const treeCache = new Map();
const expanded = new Set(['demo:src']);
const agents = [];
let projects = [], selectedId, activeFile, editorProject = 'demo', viewMode = 'single', editorVisible = innerWidth > 655, width = 46;
let rightPanel = 'editor';
let inspector;
let searchTimer;
let searchVersion = 0;
let toastTimer, saveTimer, stateWrites = Promise.resolve(), popAnchor, popRender;

async function request(route, { method = 'GET', body, raw = false, keepalive = false } = {}) {
  const headers = { 'X-Tezgah-Token': token, 'X-Tezgah-Locale': getLocale() };
  if (body != null) headers['Content-Type'] = 'application/json';
  const response = await fetch(`/api/${route}`, { method, headers, body: body == null ? undefined : JSON.stringify(body), keepalive });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error(error.error || t('Yerel bağlantı kurulamadı.')), { status: response.status });
  }
  return raw ? response : response.json();
}

const query = (route, params) => `${route}?${new URLSearchParams(params)}`;
const projectOf = (id) => projects.find((project) => project.id === id);
const agentOf = (id) => agents.find((agent) => agent.id === id);
const selected = () => agentOf(selectedId);
const openTab = () => tabs.get(activeFile);
const keyFor = (project, file) => `${project}:${file}`;
const filename = (file) => file.split('/').at(-1);
const catalogModel = (agent) => (catalogs[agent.provider]?.models ?? []).find((entry) => entry.id === agent.model);
const modelLabel = (agent) => t(catalogModel(agent)?.name || agent.modelName || 'Varsayılan model');
const isDirty = (tab) => tab && tab.text !== tab.disk;
const modelKey = (agent) => JSON.stringify([agent.provider, agent.model]);
const profile = (agent) => ({ permissions: 'ask', ...modelProfiles.get(modelKey(agent)) });
const activeEffort = (agent) => profile(agent).effort ?? agent.effort;
const activeMode = (agent) => profile(agent).mode ?? agent.mode;
const canSend = (agent) => !!(agent.draft.trim() || agent.image || (agent.goal && (agent.goal !== agent.sentGoal || agent.resumeGoal)));
const handoffTarget = (agent) => JSON.stringify([agent.project, agent.provider, agent.model, activeMode(agent), activeEffort(agent), profile(agent)]);

function saveModelOption(agent, key, value) {
  const id = modelKey(agent);
  modelProfiles.set(id, { ...modelProfiles.get(id), [key]: value });
  for (const item of agents) if (modelKey(item) === id) updateAgentControls(item);
  saveView();
}

function freshAgent(provider, project, name) {
  const models = catalogs[provider]?.models ?? [];
  const first = models.find((model) => model.isDefault) || (provider === 'claude' ? models[0] : null);
  return { id: crypto.randomUUID(), name: name || providers[provider].name, provider, project, model: first?.id ?? '', modelName: first?.name ?? '', effort: first?.defaultEffort ?? '', mode: 'code', messages: [], draft: '', resume: '', state: 'idle' };
}

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}

function saveView(immediately = false) {
  clearTimeout(saveTimer);
  const write = () => {
    const snapshot = {
      agents: agents.map(({ id, name, provider, project, model, modelName, effort, mode, messages, draft, resume, transferHistory, goal, sentGoal, goalStatus }) => ({
        id, name, provider, project, model, modelName, effort, mode, draft: draft.slice(0, 60_000), resume, transferHistory,
        goal, sentGoal, goalStatus, messages: messages.slice(-20).map((entry) => ({ ...entry, text: entry.text?.slice(0, 9000), approval: undefined })),
      })),
      modelProfiles: [...modelProfiles], appearance, locale: getLocale(), selectedId, editorProject, viewMode, rightPanel, editorVisible, width, activeFile: openTab()?.file,
      orchestration: { leaderId: orchestration.leaderId, workerIds: orchestration.workerIds, jobs: orchestration.jobs.slice(-24).map(({ done, ...job }) => job) },
    };
    stateWrites = stateWrites.catch(() => {}).then(() => request('state', { method: 'PUT', body: snapshot })).catch(() => { $('status-message').textContent = t('Çalışma görünümü kaydedilemedi'); });
  };
  if (immediately) write();
  else saveTimer = setTimeout(write, 350);
}

function fileIcon(file) {
  const ext = file.split('.').at(-1).toLowerCase();
  if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'].includes(ext)) return el('span', `file-icon ${ext.startsWith('t') ? 'ts' : 'js'}`, ext.startsWith('t') ? 'TS' : 'JS');
  return el('span', 'file-icon', icon(ext === 'md' ? 'markdown' : 'file'));
}

function renderGlobal() {
  applyAppearance();
  $('app').classList.toggle('editor-hidden', !editorVisible);
  $('app').style.setProperty('--editor-width', `${width}%`);
  $('editor-toggle').setAttribute('aria-pressed', editorVisible);
  $('view-single').setAttribute('aria-pressed', viewMode === 'single');
  $('view-split').setAttribute('aria-pressed', viewMode === 'split');
  $('view-orchestrator').setAttribute('aria-pressed', viewMode === 'orchestrator');
  document.querySelector('.connection-dot').classList.toggle('ok', Object.values(catalogs).some((entry) => entry.status === 'ready'));
  const project = projectOf(editorProject);
  $('workspace-button').replaceChildren(icon('folder'), el('strong', '', project?.name || t('Proje aç')), icon('down'));
  $('workspace-button').title = project?.root || t('Proje aç');
  $('tree-project').replaceChildren(icon('folder'), el('span', '', project?.name || t('Proje seçilmedi')));
  $('status-project').replaceChildren(icon('folder'), el('span', '', project?.name || 'Konsey'));
  const running = busy.size;
  $('running-count').hidden = running === 0;
  $('running-count').textContent = t('{count} çalışıyor', { count: running });
  const projectsRunning = [...busy.values()].map((item) => item.project);
  const shared = projectsRunning.find((id, index) => projectsRunning.indexOf(id) !== index);
  $('status-message').textContent = shared ? t('{project} · Ortak klasörde paralel çalışma', { project: projectOf(shared)?.name || t('Proje') })
    : running === 1 ? t('1 ajan çalışıyor') : running ? t('{count} ajan çalışıyor', { count: running }) : '';
  $('agent-list').replaceChildren(...agents.map((agent) => {
    const row = button(`agent-row ${agent.id === selectedId ? 'active' : ''}`, `${agent.name} · ${projectOf(agent.project)?.name || ''}`,
      providerIcon(agent.provider), el('span', 'agent-label', el('strong', '', agent.name), el('small', '', [agent.id === orchestration.leaderId ? 'Orchestrator' : agent.name !== providers[agent.provider].name && providers[agent.provider].name, projectOf(agent.project)?.name || t('Proje')].filter(Boolean).join(' · '))),
      el('span', `agent-dot ${busy.has(agent.id) ? 'running' : agent.state === 'error' ? 'error' : catalogs[agent.provider]?.status === 'ready' ? 'ready' : ''}`));
    row.setAttribute('aria-pressed', agent.id === selectedId);
    row.onclick = () => selectAgent(agent, true);
    return row;
  }));
  renderWorkerMonitor();
}

function selectAgent(agent, focus = false) {
  if (selectedId !== agent.id || (focus && viewMode === 'orchestrator' && agent.id !== orchestration.leaderId)) {
    if (focus && viewMode === 'orchestrator' && agent.id !== orchestration.leaderId) viewMode = 'single';
    selectedId = agent.id;
    renderAgents();
    renderGlobal();
    saveView();
  }
  if (focus) {
    layouts.get(agent.id)?.pane.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    layouts.get(agent.id)?.prompt.focus({ preventScroll: true });
    $('app').classList.remove('sidebar-open');
  }
}

function renderAgents() {
  const grid = $('agent-grid');
  const start = Math.max(0, Math.min(agents.findIndex((item) => item.id === selectedId), agents.length - maxPanels));
  const visible = viewMode === 'split' ? agents.slice(start, start + maxPanels)
    : [viewMode === 'orchestrator' ? agentOf(orchestration.leaderId) : selected()].filter(Boolean);
  const focused = document.activeElement;
  grid.classList.toggle('split', viewMode === 'split');
  grid.classList.toggle('single-tile', visible.length === 1);
  grid.classList.toggle('many-tiles', visible.length > 4);
  for (const node of [...grid.children]) if (!visible.some((agent) => agent.id === node.dataset.agent)) node.remove();
  for (const [index, agent] of visible.entries()) {
    if (!layouts.has(agent.id)) createAgentPane(agent);
    const layout = layouts.get(agent.id);
    if (grid.children[index] !== layout.pane) grid.insertBefore(layout.pane, grid.children[index] ?? null);
    updateAgentControls(agent);
    if (!layout.transcript.hasChildNodes()) renderTranscript(agent, true);
  }
  if (focused?.isConnected && focused !== document.activeElement && grid.contains(focused)) focused.focus({ preventScroll: true });
}

function chooseOrchestrator(id) {
  const agent = agentOf(id);
  if (!agent || busy.has(orchestration.leaderId)) return;
  orchestration.leaderId = agent.id;
  orchestration.workerIds = agents.filter((worker) => worker.id !== id && worker.project === agent.project).slice(0, 7).map((worker) => worker.id);
  selectedId = agent.id;
  renderGlobal();
  renderAgents();
  saveView();
}

function workerTeamDialog() {
  const leader = agentOf(orchestration.leaderId);
  if (!leader || busy.has(leader.id)) return;
  openDialog(t('Görev ajanları'), (body, close) => {
    const candidates = agents.filter((agent) => agent.id !== leader.id);
    const list = el('div', 'worker-options');
    for (const candidate of candidates) {
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.value = candidate.id;
      checkbox.checked = orchestration.workerIds.includes(candidate.id);
      list.append(el('label', 'worker-option', checkbox, providerIcon(candidate.provider), el('span', '', `${candidate.name} · ${projectOf(candidate.project)?.name || t('Proje')}`)));
    }
    const apply = button('button-primary', '', t('Kaydet'));
    apply.disabled = !candidates.length;
    apply.onclick = () => {
      orchestration.workerIds = [...list.querySelectorAll(':checked')].map((input) => input.value).slice(0, 7);
      close();
      renderWorkerMonitor();
      saveView(true);
    };
    body.append(el('p', '', t(candidates.length ? 'Görev alabilecek ajanları seç.' : 'Görev ajanı eklemek için yeni bir ajan oluştur.')), list, el('div', 'dialog-actions', apply));
  });
}

function renderWorkerMonitor() {
  const viewing = viewMode === 'orchestrator';
  $('orchestration-toolbar').hidden = !viewing;
  const monitor = $('orchestration-monitor');
  monitor.hidden = !viewing;
  if (!viewing) return;
  const leader = agentOf(orchestration.leaderId);
  const select = $('orchestrator-select');
  if (select.options.length !== agents.length || [...select.options].some((item, index) => item.value !== agents[index].id || item.textContent !== agents[index].name)) {
    select.replaceChildren(...agents.map((agent) => option(agent.id, agent.name)));
  }
  select.value = leader?.id || '';
  select.disabled = !!leader && busy.has(leader.id);
  $('orchestrator-team').disabled = !leader || busy.has(leader.id);
  const recent = orchestration.jobs.filter((job) => job.leaderId === leader?.id).slice(-12).reverse();
  const statuses = { running: 'Çalışıyor', completed: 'Tamamlandı', failed: 'Başarısız', cancelled: 'Durduruldu', interrupted: 'Yarım kaldı' };
  const rows = recent.map((job) => {
    const worker = agentOf(job.workerId);
    const run = busy.get(job.workerId);
    const waits = job.status === 'running' && run?.approvals.size > 0;
    const partial = run && [...run.outputs.values()].at(-1)?.text;
    const result = job.result || (job.status === 'running' ? partial || run?.activity : '');
    const view = button('icon-button small', t('Ajan sohbetini aç'), icon('corner'));
    view.disabled = !worker;
    view.onclick = () => selectAgent(worker, true);
    const identity = el('div', 'worker-identity', el('strong', '', job.workerName), job.projectName ? el('span', '', job.projectName) : null);
    return el('article', `worker-job ${job.status}`, el('header', '', providerIcon(job.provider), identity, el('small', '', t(waits ? 'Onay bekliyor' : statuses[job.status])), view),
      el('div', 'worker-task', job.prompt), result ? el('div', 'worker-result', t(result).slice(0, 360)) : null);
  });
  const scroll = monitor.scrollTop;
  monitor.replaceChildren(el('header', 'worker-monitor-title', el('strong', '', t('Ajan görevleri')),
    el('small', '', t('{count} ajan seçili', { count: orchestration.workerIds.length }))), ...rows);
  if (!rows.length) monitor.append(el('p', 'worker-empty', t('Bu ekipte henüz görev yok.')));
  monitor.scrollTop = scroll;
}

function jobResult(job) {
  return { worker_id: job.workerId, job_id: job.id, status: job.status, ...(job.result ? { result: job.result } : {}) };
}

async function handleWorkerRequest(leader, run, event) {
  let values = [];
  if (run.stopRequested || busy.get(leader.id) !== run) return;
  if (event.operation === 'start') {
    values = event.tasks.map((task) => {
      const worker = agentOf(task.id);
      const selectedWorker = run.team.find((entry) => entry.id === task.id);
      if (!worker || !selectedWorker || selectedWorker.configuration !== handoffTarget(worker)) {
        return { worker_id: task.id, status: 'unavailable', result: t('Görev gönderme yetkisi yok.') };
      }
      if (busy.has(worker.id)) return { worker_id: task.id, status: 'busy' };
      const job = { id: crypto.randomUUID(), leaderId: leader.id, workerId: worker.id, workerName: worker.name, provider: worker.provider, projectName: projectOf(worker.project)?.name, prompt: task.prompt.slice(0, 500), status: 'running' };
      run.jobs.push(job);
      orchestration.jobs.push(job);
      if (orchestration.jobs.length > 48) orchestration.jobs.splice(0, orchestration.jobs.length - 48);
      const text = t('{agent} tarafından verilen görev:\n{task}', { agent: leader.name, task: task.prompt });
      job.done = submit(worker, { text, delegatedBy: leader.id, mode: run.mode === 'plan' ? 'plan' : undefined }).then((outcome) => {
        job.status = outcome?.status ?? 'failed';
        job.result = outcome?.result ?? '';
        renderWorkerMonitor();
        saveView(true);
      });
      return jobResult(job);
    });
    renderWorkerMonitor();
    saveView();
  } else if (event.operation === 'wait') {
    const jobs = run.jobs.slice(-12);
    let timer;
    try { await Promise.race([Promise.all(jobs.map((job) => job.done)), new Promise((resolve) => { timer = setTimeout(resolve, 14_000); })]); }
    finally { clearTimeout(timer); }
    values = jobs.map(jobResult);
  }
  if (busy.get(leader.id) !== run) return;
  try { await request('turn/reply', { method: 'POST', body: { id: leader.id, requestId: event.requestId, value: values } }); }
  catch (error) { if (!run.stopRequested && error.status !== 404) toast(error.message); }
}

function createAgentPane(agent) {
  const pane = el('article', 'agent-pane');
  pane.dataset.agent = agent.id;
  pane.setAttribute('aria-label', t('{agent} sohbeti', { agent: agent.name }));
  const head = el('header', 'agent-head');
  const transcript = el('div', 'transcript');
  const prompt = el('textarea', 'prompt');
  prompt.placeholder = t('Ajana bir görev ver…');
  prompt.rows = 2;
  prompt.maxLength = 60_000;
  prompt.value = agent.draft;
  prompt.setAttribute('aria-label', t('{agent} mesajı', { agent: agent.name }));
  const context = el('div', 'composer-context');
  const controls = el('div', 'composer-controls');
  const send = button('send-button', t('Mesajı gönder'), icon('arrowUp'));
  send.onclick = () => busy.has(agent.id) ? stopTurn(agent) : submit(agent);
  const note = el('div', 'composer-note');
  const queue = el('div', 'handoff-queue');
  const composer = el('div', 'composer', context, prompt, controls);
  const area = el('div', 'composer-area', queue, composer, note);
  pane.append(head, transcript, area);
  layouts.set(agent.id, { pane, head, transcript, prompt, controls, send, note, context, queue, bubbles: new Map() });
  pane.addEventListener('focusin', () => {
    if (selectedId !== agent.id) {
      selectedId = agent.id;
      renderGlobal();
      saveView();
    }
  });
  prompt.addEventListener('input', () => {
    agent.draft = prompt.value;
    send.disabled = !busy.has(agent.id) && !canSend(agent);
    saveView();
  });
  prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.isComposing && !busy.has(agent.id)) {
      event.preventDefault();
      submit(agent);
    }
  });
}

function composerTool(className, glyph, label, title, arrow = true) {
  return button(`composer-tool ${className}`, title, icon(glyph), el('span', 'truncate', label), arrow ? el('span', 'chevron', icon('down')) : null);
}

function updateAgentControls(agent) {
  const layout = layouts.get(agent.id);
  if (!layout) return;
  const running = busy.has(agent.id);
  layout.pane.setAttribute('aria-label', t('{agent} sohbeti', { agent: agent.name }));
  layout.prompt.setAttribute('aria-label', t('{agent} mesajı', { agent: agent.name }));
  layout.prompt.placeholder = t('Ajana bir görev ver…');
  const transfer = button('icon-button', t('Yanıtı başka ajana aktar'), icon('handoff'));
  transfer.disabled = agents.length < 2 || !agent.messages.some((message) => message.role === 'assistant' && message.text?.trim());
  transfer.onclick = () => handoffDialog(agent);
  const more = button('icon-button', t('Ajan ayarları'), icon('dots'));
  more.onclick = () => openPopover(more, () => [
    menuButton('settings', t('Ajanı düzenle'), () => agentDialog(agent)),
    menuButton('x', t('Ajanı kapat'), () => closeAgent(agent), { disabled: running || agents.length === 1 }),
  ]);
  layout.head.replaceChildren(providerIcon(agent.provider), el('span', 'agent-label', el('strong', '', agent.name), el('small', '', projectOf(agent.project)?.name || t('Proje'))), transfer, more);
  const model = composerTool(`model ${agent.provider}`, agent.provider, modelLabel(agent), t('Model seç'));
  model.onclick = () => modelPopover(model, agent);
  const prefs = profile(agent);
  const chosenEffort = activeEffort(agent);
  const chosenMode = activeMode(agent);
  const effort = composerTool('', 'bolt', `${t(effortLabels[chosenEffort] || chosenEffort)}${agent.provider === 'claude' && prefs.ultracode ? ' · Ultra' : ''}`, t('Düşünme seviyesi'));
  effort.onclick = () => openPopover(effort, () => {
    const levels = catalogModel(agent)?.efforts ?? (agent.provider === 'antigravity' ? [] : ['low', 'medium', 'high', 'xhigh']);
    return [el('div', 'popover-heading', t('Düşünme seviyesi')), ...['', ...levels].map((level) => menuButton('bolt', t(effortLabels[level] || level), () => saveModelOption(agent, 'effort', level), { checked: chosenEffort === level })),
      ...(agent.provider === 'claude' ? [el('div', 'popover-heading', 'Claude Code'), menuButton('sparkle', 'Ultracode', () => saveModelOption(agent, 'ultracode', !prefs.ultracode), { checked: prefs.ultracode, disabled: !levels.includes('xhigh') })] : [])];
  });
  const mode = composerTool(chosenMode === 'plan' ? 'plan' : '', chosenMode === 'plan' ? 'checklist' : 'terminal', chosenMode === 'plan' ? t('Plan modu') : t('Kod modu'), t('Çalışma modu'));
  mode.onclick = () => openPopover(mode, () => [
    el('div', 'popover-heading', t('Çalışma modu')),
    menuButton('terminal', t('Kod modu'), () => setMode(agent, 'code'), { checked: chosenMode === 'code' }),
    menuButton('checklist', t('Plan modu'), () => setMode(agent, 'plan'), { checked: chosenMode === 'plan' }),
  ]);
  const actions = button('composer-tool tool-toggle', t('Araçlar ve ekler'), icon('plus'));
  actions.onclick = () => toolsPopover(actions, agent);
  const permissions = button('composer-tool permissions-toggle', t('Onay ayarı · {setting}', { setting: t(approvalLabels[prefs.permissions]) }), icon('shield'));
  permissions.classList.toggle('full-access', prefs.permissions === 'full');
  permissions.onclick = () => approvalPopover(permissions, agent);
  model.disabled = effort.disabled = mode.disabled = actions.disabled = permissions.disabled = running;
  layout.controls.replaceChildren(model, effort, mode, el('span', 'composer-spacer'), el('div', 'composer-end', actions, permissions, layout.send));
  layout.send.disabled = !running && !canSend(agent);
  layout.send.classList.toggle('running', running);
  layout.send.title = running ? t('Ajanı durdur') : t('Mesajı gönder');
  layout.send.setAttribute('aria-label', layout.send.title);
  layout.send.replaceChildren(icon(running ? 'square' : 'arrowUp'));
  const status = running ? t('Ajan çalışıyor') : chosenMode === 'plan' ? t('Salt okunur planlama') : t(statusLabels[catalogs[agent.provider]?.status] || 'CLI bağlantısı kontrol ediliyor');
  layout.note.replaceChildren(el('span', '', status), el('span', 'keyboard-hint', el('kbd', '', '↵'), t(' gönder · '), el('kbd', '', '⇧ ↵'), t(' yeni satır')));
  const chips = (agent.attachments || []).map((entry) => contextChip(entry.folder ? 'folder' : 'file', entry.file, () => {
    agent.attachments = agent.attachments.filter((item) => item !== entry);
    updateAgentControls(agent);
  }));
  if (agent.image) chips.push(contextChip('draw', t('Çizim'), () => { agent.image = ''; updateAgentControls(agent); }));
  if (agent.chromeTab?.model === modelKey(agent)) chips.push(contextChip('monitor', `Chrome · ${agent.chromeTab.title}`, () => { agent.chromeTab = null; updateAgentControls(agent); }));
  if (agent.goal) {
    const suffix = t(goalLabels[agent.goalStatus]);
    const edit = button('attachment', t('Görev hedefini düzenle'), icon('target'), el('span', '', suffix ? `${suffix} · ${agent.goal}` : agent.goal));
    edit.onclick = () => goalDialog(agent);
    chips.push(edit);
  }
  layout.context.hidden = !chips.length;
  layout.context.replaceChildren(...chips);
  renderHandoffQueue(agent, layout.queue);
}

function renderHandoffQueue(agent, element) {
  const pending = queuedHandoffs.get(agent.id);
  element.hidden = !pending;
  if (!pending) { element.replaceChildren(); return; }
  const running = busy.has(agent.id);
  const changed = pending.target !== handoffTarget(agent);
  const remove = button('icon-button small', t('Sıradaki aktarımı kaldır'), icon('x'));
  remove.onclick = () => { queuedHandoffs.delete(agent.id); updateAgentControls(agent); };
  const process = button('secondary-button', '', changed ? t('Taslağa al') : t('Çalıştır'));
  process.onclick = () => {
    if (changed) {
      const next = [agent.draft, pending.text].filter(Boolean).join('\n\n');
      if (next.length > 60_000) { toast(t('Taslağın boyut sınırı aşılıyor.')); return; }
      queuedHandoffs.delete(agent.id);
      setDraft(agent, next);
      updateAgentControls(agent);
    } else runQueuedHandoff(agent);
  };
  element.replaceChildren(icon('handoff'), el('span', '', `${pending.source} · ${changed ? t('Ajan ayarları değişti') : running ? t('Sırada') : t('Hazır')}`), running && !changed ? null : process, remove);
}

function runQueuedHandoff(agent) {
  const pending = queuedHandoffs.get(agent.id);
  if (!pending || busy.has(agent.id) || pending.target !== handoffTarget(agent)) return;
  queuedHandoffs.delete(agent.id);
  submit(agent, pending);
}

function setMode(agent, mode) { saveModelOption(agent, 'mode', mode); }

function welcome(agent) {
  const starters = [
    ['code', t('Projeyi tanı'), t('Bu projeyi incele ve önemli dosyalarla birlikte kısa bir özet çıkar.'), 'plan'],
    ['checklist', t('Bir değişikliği planla'), t('Bu projede yapılabilecek bir iyileştirme öner ve adım adım uygulama planı hazırla.'), 'plan'],
    ['terminal', t('Testleri incele'), t('Testleri incele ve eksik olan önemli test senaryolarını listele.'), 'plan'],
  ];
  const list = el('div', 'starter-list');
  for (const [glyph, title, text, mode] of starters) {
    const start = button('starter', '', icon(glyph), el('span', '', title), icon('corner'));
    start.onclick = () => { setMode(agent, mode); setDraft(agent, text); };
    list.append(start);
  }
  return el('div', 'welcome', list);
}

function appendInline(parent, text) {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) parent.append(el('code', '', part.slice(1, -1)));
    else if (part.startsWith('**') && part.endsWith('**') && part.length > 4) parent.append(el('strong', '', part.slice(2, -2)));
    else parent.append(part);
  }
}

function formatted(text) {
  const fragment = document.createDocumentFragment();
  const blocks = text.split(/^```[^\n]*\n?/m);
  blocks.forEach((block, index) => {
    if (index % 2) { fragment.append(el('pre', '', el('code', '', block.replace(/\n$/, '')))); return; }
    let paragraph = [], list;
    const flush = () => {
      if (paragraph.length) {
        const p = el('p');
        appendInline(p, paragraph.join('\n'));
        fragment.append(p);
        paragraph = [];
      }
    };
    for (const line of block.split('\n')) {
      if (!line.trim()) { flush(); list = null; continue; }
      if (/^#{1,6}\s/.test(line)) {
        flush(); list = null;
        const title = el('h3');
        appendInline(title, line.replace(/^#+\s+/, ''));
        fragment.append(title);
      } else if (/^\s*[-*]\s/.test(line)) {
        flush();
        if (!list) { list = el('ul'); fragment.append(list); }
        const item = el('li');
        appendInline(item, line.replace(/^\s*[-*]\s+/, ''));
        list.append(item);
      } else { list = null; paragraph.push(line); }
    }
    flush();
  });
  return fragment;
}

function approvalCard(agent, event) {
  const card = el('div', 'approval', el('strong', '', t(event.title)));
  if (event.detail) card.append(el('pre', '', event.detail));
  const actions = el('div', 'approval-actions');
  const reply = async (value) => {
    try {
      await request('turn/reply', { method: 'POST', body: { id: agent.id, requestId: event.requestId, value } });
      busy.get(agent.id)?.approvals.delete(event.requestId);
      card.remove();
    } catch (error) { toast(error.message); }
  };
  if (event.kind === 'input') {
    const fields = new Map();
    for (const question of event.questions ?? []) {
      const input = document.createElement('input');
      if (question.isSecret) input.type = 'password';
      const heading = el('label', 'input-question', el('span', '', question.question), input);
      fields.set(question.id, input);
      const options = el('div', 'approval-actions');
      for (const choice of question.options ?? []) {
        const pick = button('secondary-button', choice.description || '', choice.label);
        pick.onclick = () => { input.value = choice.label; };
        options.append(pick);
      }
      card.append(heading, options);
    }
    const yes = button('button-primary', '', t('Yanıtla'));
    yes.onclick = () => reply(Object.fromEntries([...fields].filter(([, input]) => input.value.trim()).map(([id, input]) => [id, input.value])));
    actions.append(yes);
  } else {
    const yes = button('button-primary', '', t('Bir kez izin ver'));
    yes.onclick = () => reply(true);
    actions.append(yes);
  }
  const no = button('secondary-button', '', event.kind === 'input' ? t('Atla') : t('Reddet'));
  no.onclick = () => reply(false);
  actions.append(no);
  card.append(actions);
  return card;
}

function renderTranscript(agent, reset = false) {
  const layout = layouts.get(agent.id);
  if (!layout) return;
  const box = layout.transcript;
  const nearBottom = reset || box.scrollHeight - box.clientHeight - box.scrollTop < 90;
  const run = busy.get(agent.id);
  const focused = box.querySelector('.run-progress')?.contains(document.activeElement) ? document.activeElement : null;
  box.classList.toggle('has-messages', agent.messages.length > 0);
  if (reset) { box.replaceChildren(); layout.bubbles.clear(); }
  if (!agent.messages.length) { box.replaceChildren(welcome(agent)); return; }
  box.querySelector('.welcome')?.remove();
  box.querySelector('.run-progress')?.remove();
  for (const message of agent.messages) {
    let bubble = layout.bubbles.get(message.id);
    if (!bubble) {
      const body = el('div', `message-body ${message.channel === 'plan' ? 'message-plan' : ''}`);
      const name = message.role === 'assistant' ? el('div', 'message-name', providerIcon(message.provider || agent.provider), providers[message.provider || agent.provider].name, message.channel === 'plan' ? ' · Plan' : '') : null;
      const node = el('div', `message message-${message.role}`, name, body);
      box.append(node);
      bubble = { node, body };
      layout.bubbles.set(message.id, bubble);
    }
    if (bubble.text !== message.text) {
      bubble.text = message.text;
      if (message.role === 'assistant') bubble.body.replaceChildren(formatted(message.text));
      else if (message.role === 'error') bubble.body.replaceChildren(el('div', 'turn-error', t(message.text)));
      else bubble.body.textContent = message.role === 'notice' ? t(message.text) : message.text;
    }
  }
  if (run) {
    const progress = el('div', 'run-progress');
    if (run.steps?.length) progress.append(el('div', 'plan-steps', ...run.steps.map((step) => el('div', `plan-step ${step.status}`, icon(step.status === 'completed' ? 'check' : step.status === 'inProgress' ? 'clock' : 'circle'), el('span', '', step.step)))));
    if (run.activity) progress.append(el('span', 'activity-label', t(run.activity)));
    for (const event of run.approvals.values()) {
      if (!event.card) event.card = approvalCard(agent, event);
      progress.append(event.card);
    }
    box.append(progress);
    if (focused?.isConnected) focused.focus({ preventScroll: true });
  }
  if (nearBottom) box.scrollTop = box.scrollHeight;
}

function setDraft(agent, text, focus = true) {
  agent.draft = text.slice(0, 60_000);
  const layout = layouts.get(agent.id);
  if (layout) {
    layout.prompt.value = agent.draft;
    layout.send.disabled = !busy.has(agent.id) && !canSend(agent);
    if (focus) layout.prompt.focus();
  }
  saveView();
}

async function stopTurn(agent) {
  const run = busy.get(agent.id);
  if (!run) return;
  run.stopRequested = true;
  run.activity = t('Durduruluyor…');
  renderTranscript(agent);
  for (const job of run.jobs) {
    const worker = agentOf(job.workerId);
    if (worker && job.status === 'running' && busy.get(worker.id)?.delegatedBy === agent.id) void stopTurn(worker);
  }
  try { await request('turn/cancel', { method: 'POST', body: { id: agent.id } }); }
  catch (error) { toast(error.message); }
}

async function submit(agent, handoff) {
  if ((!handoff && !canSend(agent)) || busy.has(agent.id)) return;
  if (!handoff && agent.image && catalogModel(agent)?.supportsVision === false) { toast(t('Bu model çizim kabul etmiyor. Görsel destekli bir model seç.')); return; }
  const text = handoff?.text || agent.draft.trim() || (agent.goal ? t('Bu görev hedefi üzerinde çalış.') : t('Eklediğim çizimi incele.'));
  const delegatedBy = handoff?.delegatedBy;
  const mode = handoff?.mode ?? activeMode(agent);
  const team = !delegatedBy && viewMode === 'orchestrator' && orchestration.leaderId === agent.id
    ? orchestration.workerIds.map(agentOf).filter(Boolean).map((worker) => ({ id: worker.id, name: worker.name, project: worker.project, provider: worker.provider, model: worker.model, configuration: handoffTarget(worker) })) : [];
  const instruction = team.length ? t('Bu turda Orchestrator olarak çalış. Bağımsız görevleri seçili ajanlara aktar. Son yanıtını vermeden önce görevlerin sonuçlarını topla ve birleştir.') : '';
  const history = !delegatedBy && agent.transferHistory ? agent.messages.filter((item) => item.project === agent.project && ['user', 'assistant'].includes(item.role)).slice(-6).map((item) => `${item.role === 'user' ? t('Kullanıcı') : t('Ajan')}: ${item.text}`).join('\n\n').slice(0, 14_000) : '';
  const attachments = handoff ? [] : agent.attachments || [];
  const context = attachments.map((item) => `${item.folder ? t('Proje klasörü') : t('Eklenen dosya')} (${item.file})\n${item.text}`).join('\n\n');
  const prompt = [instruction, history && t('Aynı projedeki önceki konuşma:\n{history}', { history }), context, text].filter(Boolean).join('\n\n');
  const image = handoff ? undefined : agent.image;
  const goal = delegatedBy ? undefined : (agent.goal ?? (agent.sentGoal ? '' : undefined));
  const resumeGoal = !handoff && agent.resumeGoal === true;
  if (resumeGoal) agent.resumeGoal = false;
  const turn = crypto.randomUUID();
  const run = { project: agent.project, turn, approvals: new Map(), outputs: new Map(), activity: t('Ajan başlatılıyor…'), done: false, frame: 0, team, jobs: [], delegatedBy, mode };
  const labels = [...attachments.map((item) => item.file), ...(image ? [t('Çizim')] : [])];
  agent.messages.push({ id: turn, turn, project: agent.project, role: 'user', text: labels.length ? `${text}\n\n${t('Ekler: {list}', { list: labels.join(', ') })}` : text });
  if (!handoff) {
    agent.attachments = [];
    agent.image = '';
  }
  agent.state = 'idle';
  busy.set(agent.id, run);
  if (!handoff) setDraft(agent, '', false);
  else saveView();
  closePopover();
  renderGlobal();
  updateAgentControls(agent);
  renderTranscript(agent);
  const redraw = () => {
    if (!run.frame) run.frame = requestAnimationFrame(() => {
      run.frame = 0;
      renderTranscript(agent);
      if (delegatedBy) renderWorkerMonitor();
    });
  };
  const handle = (event) => {
    if (event.type === 'resume' && event.id && !delegatedBy) { agent.resume = event.id; agent.transferHistory = false; saveView(); }
    if (event.type === 'delegate') void handleWorkerRequest(agent, run, event);
    if (event.type === 'goal') {
      agent.goalStatus = event.status;
      agent.sentGoal = goal;
      updateAgentControls(agent);
      saveView();
    }
    if (event.type === 'text' && typeof event.text === 'string') {
      const id = `${turn}:${event.id ?? 'reply'}`;
      let message = run.outputs.get(id);
      if (!message) {
        message = { id, turn, project: agent.project, role: 'assistant', channel: event.channel, provider: agent.provider, text: '' };
        run.outputs.set(id, message);
        agent.messages.push(message);
        updateAgentControls(agent);
      }
      if (message.text.length < 180_000) message.text += event.text;
      run.activity = '';
    }
    if (event.type === 'plan') run.steps = event.steps;
    if (event.type === 'activity') {
      run.activity = event.text || run.activity;
      if (event.refresh && editorProject === agent.project) checkEditorChanges();
    }
    if (event.type === 'approval') run.approvals.set(event.requestId, event);
    if (event.type === 'error') {
      run.done = true;
      run.problem = event.message;
      agent.state = 'error';
      agent.messages.push({ id: crypto.randomUUID(), turn, role: 'error', text: event.message });
    }
    if (event.type === 'done') {
      run.done = true;
      if (event.status === 'completed') { if (!delegatedBy) agent.sentGoal = goal; run.completed = true; }
      run.cancelled = event.status === 'cancelled';
      if (event.status === 'cancelled') agent.messages.push({ id: crypto.randomUUID(), turn, role: 'notice', text: 'Ajan durduruldu.' });
      else if (!run.outputs.size && !run.steps?.length) agent.messages.push({ id: crypto.randomUUID(), turn, role: 'notice', text: 'Görev tamamlandı.' });
      else if (!run.outputs.size) agent.messages.push({ id: crypto.randomUUID(), turn, project: agent.project, role: 'assistant', provider: agent.provider, channel: 'plan', text: run.steps.map((step) => `- ${step.step}`).join('\n') });
    }
    redraw();
  };
  try {
    const chromeTab = agent.chromeTab?.model === modelKey(agent) ? agent.chromeTab.id : '';
    const response = await request('turn', { method: 'POST', raw: true, body: { id: agent.id, provider: agent.provider, project: agent.project, prompt, model: agent.model, effort: activeEffort(agent), mode, resume: delegatedBy ? '' : agent.resume, options: { ...profile(agent), chromeTab, workers: team }, image, goal, resumeGoal } });
    if (run.stopRequested) stopTurn(agent);
    let buffer = '';
    for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) if (line.trim()) handle(JSON.parse(line));
    }
    if (buffer.trim()) handle(JSON.parse(buffer));
    if (!run.done) throw new Error(t('Ajan bağlantısı yanıt tamamlanmadan kapandı.'));
  } catch (error) {
    agent.state = 'error';
    run.problem = error.message;
    agent.messages.push({ id: crypto.randomUUID(), turn, role: 'error', text: error.message });
  } finally {
    cancelAnimationFrame(run.frame);
    busy.delete(agent.id);
    renderGlobal();
    updateAgentControls(agent);
    renderTranscript(agent);
    saveView(true);
    if (editorProject === agent.project) { refreshTree(); checkEditorChanges(); }
    if (run.completed && !run.stopRequested) runQueuedHandoff(agent);
  }
  const result = [...run.outputs.values()].map((item) => item.text).join('\n\n') || run.steps?.map((step) => step.step).join('\n') || run.problem || '';
  return { status: run.completed ? 'completed' : run.cancelled || run.stopRequested ? 'cancelled' : 'failed', result: result.slice(0, 6000) };
}

function menuButton(glyph, label, action, { checked, disabled } = {}) {
  const node = button('menu-item', '', icon(glyph), el('span', 'menu-fill', label), checked ? el('span', 'check', icon('check')) : null);
  node.disabled = !!disabled;
  node.onclick = () => { closePopover(); action(); };
  return node;
}

function contextChip(glyph, label, onRemove) {
  const chip = button('attachment', t('{label} ekini kaldır', { label }), icon(glyph), el('span', '', label), icon('x'));
  chip.onclick = onRemove;
  return chip;
}

function toolsPopover(anchor, agent) {
  const prefs = profile(agent);
  const plan = activeMode(agent) === 'plan';
  openPopover(anchor, () => [
    el('div', 'popover-heading', t('Mesaja ekle')),
    menuButton('folder', t('Dosya ve klasörler'), () => attachmentDialog(agent)),
    menuButton('target', t('Görev hedefi'), () => goalDialog(agent), { checked: !!agent.goal }),
    menuButton('draw', t('Çizim ekle'), () => sketchDialog(agent), { checked: !!agent.image, disabled: catalogModel(agent)?.supportsVision === false }),
    menuButton('checklist', t('Plan modu'), () => setMode(agent, plan ? 'code' : 'plan'), { checked: plan }),
    el('div', 'popover-heading', t('Bu modelin araçları')),
    menuButton('monitor', t('Tarayıcı kullanımı'), () => saveModelOption(agent, 'browser', !prefs.browser), { checked: prefs.browser, disabled: plan || !availableTools.includes('browser') }),
    menuButton('monitor', t('Google Chrome bağla'), () => chromeDialog(agent), { checked: agent.chromeTab?.model === modelKey(agent), disabled: plan || !availableTools.includes('chromeTabs') }),
    menuButton('terminal', t('Bilgisayar kullanımı'), () => saveModelOption(agent, 'computer', !prefs.computer), { checked: prefs.computer, disabled: plan || !availableTools.includes('computer') }),
    ...(agent.provider === 'claude' ? [menuButton('monitor', 'Claude in Chrome', () => saveModelOption(agent, 'chrome', !prefs.chrome), { checked: prefs.chrome, disabled: plan })] : []),
    ...(plan ? [el('div', 'popover-empty', t('Tarayıcı ve bilgisayar araçları kod modunda kullanılabilir.'))] : !availableTools.length ? [el('div', 'popover-empty', t('Masaüstü araçları Electron penceresinde kullanılabilir.'))] : []),
  ]);
}

function chromeDialog(agent) {
  openDialog(t('Google Chrome bağla'), (body, close) => {
    const tabs = el('div', 'chrome-tabs');
    const status = el('p');
    const refresh = button('secondary-button', '', icon('refresh'), t('Yenile'));
    const load = async () => {
      status.textContent = t('Chrome sekmeleri yükleniyor…');
      tabs.replaceChildren();
      refresh.disabled = true;
      try {
        const entries = await request('browser/tabs');
        status.textContent = entries.length ? t('Bu ajana bağlanacak sekmeyi seç.') : t('Chrome’da bağlanılabilir bir sekme bulunamadı.');
        for (const entry of entries) {
          const select = button('chrome-tab', entry.url, icon('monitor'), el('span', '', el('strong', '', entry.title || entry.url), el('small', '', entry.url)));
          select.onclick = () => {
            agent.chromeTab = { id: entry.id, title: entry.title || entry.url, model: modelKey(agent) };
            saveModelOption(agent, 'browser', true);
            close();
          };
          tabs.append(select);
        }
      } catch (error) { status.textContent = error.message; }
      finally { refresh.disabled = false; }
    };
    refresh.onclick = load;
    body.append(status, tabs, el('div', 'dialog-actions', refresh));
    load();
  });
}

function approvalPopover(anchor, agent) {
  const prefs = profile(agent);
  openPopover(anchor, () => [
    el('div', 'popover-heading', modelLabel(agent)),
    ...Object.entries(approvalLabels).map(([id, label]) => menuButton('shield', t(label), () => {
      if (id !== 'full' || prefs.permissions === 'full') { saveModelOption(agent, 'permissions', id); return; }
      openDialog(t('Bu modele tam erişim ver'), (body, close) => {
        const cancel = button('secondary-button', '', t('Vazgeç'));
        cancel.onclick = close;
        const confirm = button('button-primary', '', t('Tam erişimi aç'));
        confirm.onclick = () => { saveModelOption(agent, 'permissions', 'full'); close(); };
        body.append(el('p', '', t('{model} kod modunda sağlayıcının tam erişim ayarıyla çalışacak. Konsey’in tarayıcı ve bilgisayar işlemleri kendi onaylarını göstermeye devam eder.', { model: modelLabel(agent) })), el('div', 'dialog-actions', cancel, confirm));
      });
    }, { checked: prefs.permissions === id, disabled: id === 'auto' && catalogModel(agent)?.supportsAutoMode === false })),
    ...(activeMode(agent) === 'plan' ? [el('div', 'popover-empty', t('Plan modunda sağlayıcı salt okunur çalışır.'))] : []),
  ]);
}

function attachmentDialog(agent) {
  openDialog(t('Dosya ve klasörler'), (body, close) => {
    const form = el('form', 'dialog-body');
    form.style.padding = '0';
    const input = el('input');
    input.placeholder = t('src/dosya.js veya src');
    input.required = true;
    const type = el('select', '', option('file', t('Dosya içeriği')), option('folder', t('Klasör listesi')));
    const error = el('span', 'dialog-error');
    const open = openTab();
    const fromEditor = button('secondary-button', '', t('Açık dosyayı ekle'));
    fromEditor.disabled = !open || open.project !== agent.project;
    const add = el('button', 'button-primary', t('Ekle'));
    add.type = 'submit';
    function apply(entry) {
      const current = (agent.attachments || []).filter((item) => item.file !== entry.file);
      const remaining = 26_000 - current.reduce((total, item) => total + item.text.length, 0);
      if (remaining < 500 || current.length >= 6) { error.textContent = t('Bu mesajın ek kapasitesi dolu.'); return; }
      agent.attachments = [...current, { ...entry, text: entry.text.slice(0, remaining) }];
      close();
      updateAgentControls(agent);
    }
    fromEditor.onclick = () => apply({ file: open.file, text: open.text });
    form.onsubmit = async (event) => {
      event.preventDefault();
      const file = input.value.trim().replaceAll('\\', '/').replace(/\/$/, '');
      const project = agent.project;
      add.disabled = true;
      try {
        const folder = type.value === 'folder';
        const text = folder
          ? (await request(query('tree', { project, directory: file === '.' ? '' : file }))).map((entry) => `${entry.name}${entry.folder ? '/' : ''}`).join('\n')
          : (await request(query('file', { project, file }))).text;
        apply({ file, text, folder });
      } catch (failure) { error.textContent = failure.message; }
      finally { add.disabled = false; }
    };
    form.append(field(t('Proje yolu · {project}', { project: projectOf(agent.project)?.name || t('Proje') }), input), field(t('İçerik'), type), error, el('div', 'dialog-actions', fromEditor, add));
    body.append(form);
  });
}

function goalDialog(agent) {
  openDialog(t('Görev hedefi'), (body, close) => {
    const input = el('textarea');
    input.rows = 5;
    input.maxLength = 4000;
    input.value = agent.goal || '';
    input.placeholder = t('Örn. Testler geçene kadar bu hatayı düzelt.');
    const save = button('button-primary', '', t('Hedefi kaydet'));
    save.onclick = () => {
      const value = input.value.trim();
      if (value !== agent.goal) agent.goalStatus = '';
      agent.goal = value;
      close();
      updateAgentControls(agent);
      saveView();
    };
    const resume = button('secondary-button', '', t('Hedefe devam et'));
    resume.onclick = () => { agent.resumeGoal = true; close(); updateAgentControls(agent); submit(agent); };
    const showResume = agent.provider === 'codex' && activeMode(agent) === 'code' && agent.goal && ['paused', 'blocked', 'active'].includes(agent.goalStatus) && !busy.has(agent.id);
    body.append(field(t('Ajanın takip edeceği sonuç'), input), el('div', 'dialog-actions', showResume ? resume : null, save));
  });
}

function sketchDialog(agent) {
  openDialog(t('Çizim ekle'), (body, close) => {
    const canvas = el('canvas', 'sketch');
    canvas.width = 680;
    canvas.height = 420;
    canvas.setAttribute('aria-label', t('Çizim alanı'));
    const context = canvas.getContext('2d');
    const clear = button('secondary-button', '', t('Temizle'));
    const add = button('button-primary', '', t('Çizimi ekle'));
    const reset = () => { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); add.disabled = true; };
    reset();
    if (agent.image) {
      const previous = new Image();
      previous.onload = () => { context.drawImage(previous, 0, 0); add.disabled = false; };
      previous.src = `data:image/png;base64,${agent.image}`;
    }
    let pointer;
    const point = (event) => {
      const box = canvas.getBoundingClientRect();
      return [(event.clientX - box.left) * canvas.width / box.width, (event.clientY - box.top) * canvas.height / box.height];
    };
    canvas.onpointerdown = (event) => {
      if (pointer != null || event.button !== 0) return;
      pointer = event.pointerId;
      canvas.setPointerCapture(pointer);
      const [x, y] = point(event);
      context.strokeStyle = '#262233';
      context.lineWidth = 3;
      context.lineCap = context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + .1, y);
      context.stroke();
      add.disabled = false;
    };
    canvas.onpointermove = (event) => { if (pointer === event.pointerId) { context.lineTo(...point(event)); context.stroke(); } };
    canvas.onlostpointercapture = () => { pointer = undefined; };
    clear.onclick = reset;
    add.onclick = () => { agent.image = canvas.toDataURL('image/png').split(',')[1]; close(); updateAgentControls(agent); };
    body.append(canvas, el('div', 'dialog-actions', clear, add));
  });
}

function positionPopover() {
  if (!popAnchor || $('popover').hidden) return;
  const rect = popAnchor.getBoundingClientRect();
  const pop = $('popover');
  const below = innerHeight - rect.bottom - 12;
  const above = rect.top - 10;
  const up = below < 305 && above > below;
  pop.style.maxHeight = `${Math.max(70, Math.min(up ? above : below, 435))}px`;
  pop.style.left = `${Math.max(7, Math.min(rect.left, innerWidth - pop.offsetWidth - 7))}px`;
  pop.style.top = `${up ? rect.top - pop.offsetHeight - 5 : rect.bottom + 5}px`;
}

function openPopover(anchor, build, className = '') {
  if (popAnchor === anchor && !$('popover').hidden) { closePopover(); return; }
  popAnchor = anchor;
  const pop = $('popover');
  pop.className = `popover ${className}`;
  pop.replaceChildren(...build());
  pop.hidden = false;
  positionPopover();
  (pop.querySelector('input') || pop.querySelector('button:not([disabled])'))?.focus({ preventScroll: true });
}

function closePopover(returnFocus = false) {
  if (returnFocus) popAnchor?.focus({ preventScroll: true });
  popAnchor = popRender = null;
  $('popover').hidden = true;
}

function modelPopover(anchor, agent) {
  const search = el('input', 'menu-search');
  search.type = 'search';
  search.placeholder = t('Model ara…');
  search.setAttribute('aria-label', t('Model ara'));
  const list = el('div', 'models-list');
  const draw = () => {
    const filter = search.value.toLocaleLowerCase(getLocale()).trim();
    const groups = [];
    for (const [provider, info] of Object.entries(providers)) {
      const catalog = catalogs[provider];
      const models = (catalog?.models ?? []).filter((model) => `${info.name} ${t(model.name)} ${model.id}`.toLocaleLowerCase(getLocale()).includes(filter));
      if (filter && !models.length) continue;
      groups.push(el('div', 'popover-heading', `${info.name}${catalog?.source === 'example' ? t(' · Örnek modeller') : ''}`));
      if (!models.length) groups.push(el('div', 'popover-empty', t('Modeller kontrol ediliyor…')));
      for (const model of models) {
        const active = provider === agent.provider && model.id === agent.model;
        const pick = button('menu-item model-item', '', providerIcon(provider), el('span', 'model-description', el('strong', '', t(model.name)), el('small', '', model.id || info.name)), active ? el('span', 'check', icon('check')) : null);
        pick.onclick = () => {
          if (agent.provider !== provider) {
            agent.transferHistory = agent.messages.length > 0;
            agent.resume = '';
            agent.sentGoal = '';
            agent.goalStatus = '';
          }
          Object.assign(agent, { provider, model: model.id, modelName: model.name, effort: model.defaultEffort || '' });
          closePopover();
          updateAgentControls(agent);
          renderGlobal();
          saveView();
        };
        groups.push(pick);
      }
    }
    list.replaceChildren(...(groups.length ? groups : [el('div', 'popover-empty', t('Eşleşen model yok.')) ]));
    positionPopover();
  };
  openPopover(anchor, () => [search, list], 'models');
  if ($('popover').hidden) return;
  popRender = draw;
  search.addEventListener('input', draw);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); list.querySelector('button')?.focus(); }
  });
  draw();
}

function openDialog(title, build) {
  closePopover();
  const dialog = $('dialog');
  const close = button('icon-button', t('Kapat'), icon('x'));
  close.onclick = () => dialog.close();
  const heading = el('h2', '', title);
  heading.id = 'dialog-title';
  dialog.setAttribute('aria-labelledby', heading.id);
  const body = el('div', 'dialog-body');
  dialog.replaceChildren(el('div', 'dialog-header', heading, close), body);
  build(body, () => dialog.close());
  if (!dialog.open) dialog.showModal();
  return body;
}

const field = (label, input) => el('label', 'field', el('span', '', label), input);

function agentDialog(agent) {
  openDialog(agent ? t('Ajanı düzenle') : t('Yeni ajan'), (body, close) => {
    const form = el('form', 'dialog-body');
    form.style.padding = '0';
    const name = el('input');
    name.placeholder = t('Örn. Test ajanı');
    name.maxLength = 45;
    name.value = agent?.name || '';
    const provider = el('select', '', ...Object.entries(providers).map(([id, entry]) => option(id, entry.name)));
    provider.value = agent?.provider || Object.keys(providers).find((id) => !agents.some((item) => item.provider === id)) || 'codex';
    const project = el('select', '', ...projects.map((item) => option(item.id, item.name)));
    project.value = agent?.project || editorProject;
    const running = agent && busy.has(agent.id);
    provider.disabled = project.disabled = !!running;
    const addProject = button('secondary-button', '', t('Proje ekle'));
    addProject.onclick = () => {
      const draft = { name: name.value, provider: provider.value };
      projectDialog((added) => {
        agentDialog(agent);
        const fields = $('dialog').querySelectorAll('input, select');
        fields[0].value = draft.name;
        fields[1].value = draft.provider;
        fields[2].value = added.id;
      });
    };
    addProject.disabled = !!running;
    const confirm = el('button', 'button-primary', agent ? t('Kaydet') : t('Ajanı ekle'));
    const error = el('span', 'dialog-error');
    form.append(field(t('Ajan adı'), name), field(t('Sağlayıcı'), provider), field(t('Çalışma klasörü'), project), error, el('div', 'dialog-actions', addProject, confirm));
    body.append(form);
    name.focus();
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!agent && agents.length >= maxPanels) { error.textContent = t('Bölünmüş görünümde en fazla 8 ajan açılabilir.'); return; }
      let target = agent;
      if (!target) {
        target = freshAgent(provider.value, project.value, name.value.trim());
        agents.push(target);
        viewMode = 'split';
      } else {
        const changedFolder = target.project !== project.value;
        const changedProvider = target.provider !== provider.value;
        if (changedProvider) {
          const defaults = freshAgent(provider.value, project.value);
          Object.assign(target, { provider: defaults.provider, model: defaults.model, modelName: defaults.modelName, effort: defaults.effort });
        }
        if (changedFolder || changedProvider) {
          target.resume = '';
          target.attachments = [];
          target.image = '';
          target.chromeTab = null;
          target.sentGoal = '';
          target.goalStatus = '';
          if (changedFolder) target.goal = '';
          target.transferHistory = !changedFolder && target.messages.length > 0;
        }
        target.name = name.value.trim() || providers[target.provider].name;
        target.project = project.value;
      }
      selectedId = target.id;
      close();
      renderAgents();
      renderGlobal();
      saveView(true);
      selectAgent(target, true);
    };
  });
}

function closeAgent(agent) {
  if (busy.has(agent.id) || agents.length === 1) return;
  openDialog(t('Ajanı kapat'), (body, close) => {
    body.append(el('p', '', t('{agent} sohbeti çalışma alanından kaldırılacak.', { agent: agent.name })));
    const cancel = button('secondary-button', '', t('Vazgeç'));
    cancel.onclick = close;
    const confirm = button('button-primary', '', t('Ajanı kapat'));
    confirm.onclick = () => {
      agents.splice(agents.indexOf(agent), 1);
      layouts.delete(agent.id);
      queuedHandoffs.delete(agent.id);
      orchestration.workerIds = orchestration.workerIds.filter((id) => id !== agent.id);
      if (orchestration.leaderId === agent.id) {
        orchestration.leaderId = '';
        if (viewMode === 'orchestrator') viewMode = 'single';
      }
      if (selectedId === agent.id) selectedId = agents[0].id;
      close();
      renderAgents();
      renderGlobal();
      saveView(true);
    };
    body.append(el('div', 'dialog-actions', cancel, confirm));
  });
}

function handoffDialog(source) {
  const last = source.messages.findLast((item) => item.role === 'assistant' && item.text.trim());
  if (!last || agents.length < 2) return;
  const reply = source.messages.filter((item) => item.role === 'assistant' && (last.turn ? item.turn === last.turn : item.id === last.id)).map((item) => item.text).join('\n\n');
  openDialog(t('Yanıtı ajana aktar'), (body, close) => {
    const destination = el('select', '', ...agents.filter((item) => item.id !== source.id).map((item) => option(item.id, `${item.name} · ${projectOf(item.project)?.name || t('Proje')}`)));
    const content = el('textarea');
    content.rows = 7;
    content.value = t('{source} ({project}) şu yanıtı paylaştı:\n\n{reply}', { source: source.name, project: projectOf(last.project || source.project)?.name || t('Proje'), reply }).slice(0, 30_000);
    content.maxLength = 30_000;
    const add = button('secondary-button', '', t('Mesaj taslağına ekle'));
    add.onclick = () => {
      const target = agentOf(destination.value);
      if (!target || !content.value.trim()) return;
      if (target.draft.length + content.value.length > 59_990) { toast(t('Aktarım hedef mesajın boyut sınırını aşıyor.')); return; }
      close();
      selectAgent(target, true);
      setDraft(target, [target.draft, content.value].filter(Boolean).join('\n\n'));
      toast(t('{agent} için taslağa eklendi.', { agent: target.name }));
    };
    const send = button('button-primary');
    const label = () => { send.textContent = busy.has(destination.value) ? t('Tur bitince çalıştır') : t('Aktar ve çalıştır'); };
    destination.onchange = label;
    label();
    send.onclick = () => {
      const target = agentOf(destination.value);
      const text = content.value.trim().slice(0, 30_000);
      if (!target || !text) return;
      if (queuedHandoffs.has(target.id)) { toast(t('Bu ajan için bir aktarım zaten sırada.')); return; }
      close();
      selectAgent(target);
      const pending = { source: source.name, text, target: handoffTarget(target) };
      if (busy.has(target.id)) {
        queuedHandoffs.set(target.id, pending);
        updateAgentControls(target);
        toast(t('{agent} için sıraya alındı.', { agent: target.name }));
      } else submit(target, pending);
    };
    body.append(field(t('Hedef ajan'), destination), field(t('Aktarılacak içerik'), content), el('div', 'dialog-actions', add, send));
  });
}

function projectDialog(onAdd = switchEditorProject) {
  openDialog(t('Proje klasörü aç'), (body, close) => {
    const form = el('form', 'dialog-body');
    form.style.padding = '0';
    const root = el('input');
    root.placeholder = t('C:\\Projeler\\uygulama');
    root.spellcheck = false;
    const error = el('span', 'dialog-error');
    const browse = button('secondary-button', '', icon('folder'), t('Gözat'));
    const open = el('button', 'button-primary', t('Projeyi aç'));
    const add = async (payload) => {
      error.textContent = '';
      browse.disabled = open.disabled = true;
      try {
        const { project } = await request('project', { method: 'POST', body: payload });
        if (project) {
          if (!projectOf(project.id)) projects.push(project);
          close();
          onAdd(project);
        }
      } catch (problem) { error.textContent = problem.message; }
      finally { browse.disabled = open.disabled = false; }
    };
    browse.onclick = () => add({ browse: true });
    form.onsubmit = (event) => { event.preventDefault(); add({ root: root.value.trim() }); };
    form.append(field(t('Klasör yolu'), root), error, el('div', 'dialog-actions', browse, open));
    body.append(form);
  });
}

function connectionsDialog() {
  openDialog(t('Sağlayıcı bağlantıları'), (body, close) => {
    const rows = el('div', 'dialog-body');
    rows.style.padding = '0';
    rows.id = 'connection-rows';
    const refresh = button('secondary-button', '', icon('refresh'), t('Yenile'));
    refresh.onclick = async () => {
      refresh.disabled = true;
      await refreshCatalogs(true);
      refresh.disabled = false;
    };
    const done = button('button-primary', '', t('Tamam'));
    done.onclick = close;
    body.append(el('p', '', t('Konsey, bilgisayarındaki komut satırı araçlarını ve mevcut oturumlarını kullanır. Aşağıdaki komutlarla terminalden bağlanabilirsin.')), rows, el('div', 'dialog-actions', refresh, done));
    renderConnections();
  });
}

function applyAppearance() {
  document.documentElement.dataset.appearance = appearance.mode;
  document.documentElement.dataset.palette = appearance.palettes[appearance.mode];
}

function changeLanguage(value) {
  setLocale(value);
  localizePage();
  renderGlobal();
  for (const agent of agents) {
    updateAgentControls(agent);
    renderTranscript(agent, true);
  }
  renderEditorChrome();
  if (openTab()) editor.refreshPosition();
  renderTree();
  inspector?.refreshLanguage();
  saveView(true);
}

function appearanceDialog() {
  openDialog(t('Ayarlar'), (body, close) => {
    const locale = el('select', '', option('en', 'English'), option('tr', 'Türkçe'));
    locale.id = 'language-setting';
    locale.value = getLocale();
    locale.onchange = () => {
      changeLanguage(locale.value);
      appearanceDialog();
      $('language-setting').focus();
    };
    const mode = el('select', '', option('terminal', 'Terminal'), option('standard', t('Klasik')));
    mode.value = appearance.mode;
    const swatches = el('div', 'theme-swatches');
    swatches.setAttribute('role', 'group');
    swatches.setAttribute('aria-label', t('Renk teması'));
    function drawPalettes() {
      swatches.replaceChildren(...Object.entries(palettes).map(([id, label]) => {
        const swatch = button('theme-swatch', t(label), el('span', 'theme-sample'), el('span', '', t(label)));
        swatch.dataset.sample = id;
        swatch.setAttribute('aria-pressed', appearance.palettes[appearance.mode] === id);
        swatch.onclick = () => {
          appearance.palettes[appearance.mode] = id;
          applyAppearance();
          drawPalettes();
          swatches.querySelector(`[data-sample="${id}"]`)?.focus();
          saveView();
        };
        return swatch;
      }));
    }
    mode.onchange = () => { appearance.mode = mode.value; applyAppearance(); drawPalettes(); saveView(); };
    const connections = button('secondary-button', '', t('Sağlayıcı bağlantıları'));
    connections.onclick = connectionsDialog;
    const done = button('button-primary', '', t('Tamam'));
    done.onclick = close;
    drawPalettes();
    body.append(field(t('Dil'), locale), field(t('Görünüm'), mode), el('div', 'field', el('span', '', t('Renk teması')), swatches), el('div', 'dialog-actions', connections, done));
  });
}

function renderConnections() {
  const rows = $('connection-rows');
  if (!rows) return;
  rows.replaceChildren(...Object.entries(providers).map(([id, provider]) => {
    const status = catalogs[id]?.status || 'loading';
    const source = { aliases: t('Model takma adları'), cli: t('CLI kataloğu'), example: t('Örnek model listesi') }[catalogs[id]?.source];
    const copy = button('secondary-button', t('Kopyala: {command}', { command: provider.login }), t('Kopyala'));
    copy.onclick = async () => { try { await navigator.clipboard.writeText(provider.login); toast(t('Komut kopyalandı.')); } catch { toast(provider.login); } };
    return el('div', 'connection-row', providerIcon(id), el('div', '', el('strong', '', provider.name), el('small', '', [t(statusLabels[status]), source].filter(Boolean).join(' · ')), el('code', '', provider.login)), copy);
  }));
}

async function refreshCatalogs(force = false) {
  await Promise.all(Object.keys(providers).map(async (id) => {
    try {
      catalogs[id] = await request(query('catalog', { provider: id, refresh: force ? '1' : '0' }));
      for (const agent of agents) {
        if (agent.provider !== id || agent.model || agent.resume || busy.has(agent.id)) continue;
        const preferred = catalogs[id].models.find((model) => model.isDefault);
        if (preferred) Object.assign(agent, { model: preferred.id, modelName: preferred.name, effort: preferred.defaultEffort || '' });
      }
      if (popRender) popRender();
      for (const agent of agents) if (!layouts.get(agent.id)?.pane.contains(popAnchor)) updateAgentControls(agent);
    } catch { catalogs[id] ||= { models: [], status: 'unknown' }; }
    renderConnections();
    renderGlobal();
  }));
  saveView();
}

function projectMenu() {
  openPopover($('workspace-button'), () => [el('div', 'popover-heading', t('Editör projeleri')), ...projects.map((project) => menuButton('folder', project.name, () => switchEditorProject(project), { checked: project.id === editorProject })), menuButton('plus', t('Proje klasörü aç'), () => projectDialog())]);
}

async function switchEditorProject(project) {
  if (!project) return;
  editorProject = project.id;
  $('tree-search').value = '';
  searchVersion++;
  const latest = [...tabs.values()].findLast((tab) => tab.project === project.id);
  setActiveTab(latest?.key || null);
  renderGlobal();
  refreshTree();
  if (!latest && project.initialFile) await openFile(project.id, project.initialFile, false);
  saveView();
}

async function fetchFolder(project, directory, force = false) {
  const key = keyFor(project, directory);
  if (force || !treeCache.has(key)) {
    const nodes = await request(query('tree', { project, directory }));
    treeCache.set(key, nodes);
  }
  return treeCache.get(key);
}

async function refreshTree() {
  const project = editorProject;
  inspector?.refreshDiff();
  try {
    await fetchFolder(project, '', true);
    for (const key of [...expanded]) if (key.startsWith(`${project}:`)) {
      const directory = key.slice(project.length + 1);
      try { await fetchFolder(project, directory, true); }
      catch { expanded.delete(key); treeCache.delete(key); }
    }
    if (editorProject === project) renderTree();
  } catch (error) { if (editorProject === project) $('file-tree').replaceChildren(el('div', 'tree-empty', error.message)); }
}

function renderTree() {
  const project = editorProject;
  const search = $('tree-search').value.trim();
  if (search) {
    clearTimeout(searchTimer);
    const version = ++searchVersion;
    searchTimer = setTimeout(async () => {
      try {
        const { files, truncated } = await request(query('files/search', { project, q: search }));
        if (version !== searchVersion || $('tree-search').value.trim() !== search || project !== editorProject) return;
        const rows = files.map((file) => {
          const row = button('tree-row search-file', file, fileIcon(file), el('span', 'tree-name', file));
          row.onclick = () => openFile(project, file);
          return row;
        });
        if (truncated) rows.push(el('div', 'tree-empty', t('Aramayı daraltarak daha fazla sonuç bulabilirsin.')));
        $('file-tree').replaceChildren(...(rows.length ? rows : [el('div', 'tree-empty', t('Eşleşen dosya bulunamadı.'))]));
      } catch (error) { if (version === searchVersion) $('file-tree').replaceChildren(el('div', 'tree-empty', error.message)); }
    }, 170);
    return;
  }
  searchVersion++;
  const children = [];
  function group(directory, level) {
    if (level > 28) return;
    for (const item of treeCache.get(keyFor(project, directory)) ?? []) {
      const key = keyFor(project, item.file);
      const isOpen = expanded.has(key);
      const row = button(`tree-row ${activeFile === key ? 'active' : ''}`, item.file,
        el('span', 'chev', item.folder ? icon(isOpen ? 'down' : 'right') : null), item.folder ? el('span', 'file-icon', icon('folder')) : fileIcon(item.file), el('span', 'tree-name', item.name));
      row.style.setProperty('--level', level);
      if (item.folder) row.setAttribute('aria-expanded', isOpen);
      row.onclick = async () => {
        if (!item.folder) {
          if (await openFile(project, item.file)) $('app').classList.remove('sidebar-open');
          return;
        }
        if (expanded.has(key)) expanded.delete(key);
        else {
          try { await fetchFolder(project, item.file); expanded.add(key); }
          catch (error) { toast(error.message); }
        }
        if (editorProject === project) renderTree();
      };
      children.push(row);
      if (item.folder && isOpen) group(item.file, level + 1);
    }
  }
  group('', 0);
  $('file-tree').replaceChildren(...(children.length ? children : [el('div', 'tree-empty', t('Bu klasörde dosya yok.'))]));
}

const editor = bindEditor({ input: $('code-input'), highlight: $('highlight'), gutter: $('line-numbers'), position: $('editor-position'), onInput(text) {
  const tab = openTab();
  if (!tab) return;
  const dirty = isDirty(tab);
  tab.text = text;
  if (dirty !== isDirty(tab)) renderEditorChrome();
} });

let fileSelection = 0;
async function openFile(project, file, reveal = true) {
  const key = keyFor(project, file);
  const selection = ++fileSelection;
  try {
    if (!tabs.has(key)) {
      const data = await request(query('file', { project, file }));
      if (!tabs.has(key)) tabs.set(key, { key, project, file, ...data, disk: data.text });
    }
    if (selection !== fileSelection || editorProject !== project) return false;
    if (reveal) { editorVisible = true; inspector?.select('editor'); }
    setActiveTab(key);
    renderGlobal();
    saveView();
    return true;
  } catch (error) { toast(error.message); return false; }
}

function setActiveTab(key) {
  const old = openTab();
  if (old) old.view = editor.view();
  activeFile = key;
  const tab = openTab();
  if (tab) editor.set(tab.text, tab.file, tab.view);
  renderEditorChrome();
  renderTree();
  for (const agent of agents) updateAgentControls(agent);
}

function renderEditorChrome() {
  const current = openTab();
  $('editor-tabs').replaceChildren(...[...tabs.values()].filter((tab) => tab.project === editorProject).map((tab) => {
    const open = button('tab-open', tab.file, fileIcon(tab.file), el('span', 'tab-name', filename(tab.file)));
    open.setAttribute('role', 'tab');
    open.setAttribute('aria-selected', tab.key === activeFile);
    open.onclick = () => { setActiveTab(tab.key); saveView(); };
    const close = button('tab-close', t('{file} dosyasını kapat', { file: filename(tab.file) }), isDirty(tab) ? el('span', 'dirty-dot') : icon('x'));
    close.onclick = () => closeTab(tab);
    return el('div', `editor-tab ${tab.key === activeFile ? 'selected' : ''}`, open, close);
  }));
  $('save').disabled = !isDirty(current) || !!current?.saving;
  $('file-reload').disabled = !current || !!current.saving;
  $('code-editor').hidden = !current;
  $('editor-empty').hidden = !!current;
  $('breadcrumbs').hidden = !current;
  const crumb = [];
  if (current) for (const [index, segment] of current.file.split('/').entries()) {
    if (index) crumb.push(icon('right'));
    crumb.push(el('span', '', segment));
  }
  $('breadcrumbs').replaceChildren(...crumb);
  $('editor-eol').textContent = current?.eol || 'LF';
  $('editor-language').textContent = t(language(current?.file));
  $('editor-notice').hidden = !current?.conflict;
  $('editor-notice').textContent = t(current?.conflict || '');
  if (!current) $('editor-position').textContent = '—';
}

function closeTab(tab) {
  const remove = () => {
    tabs.delete(tab.key);
    if (activeFile === tab.key) setActiveTab([...tabs.values()].findLast((item) => item.project === editorProject)?.key || null);
    else renderEditorChrome();
    saveView();
  };
  if (!isDirty(tab)) { remove(); return; }
  confirmDiscard(t('{file} dosyasındaki değişiklikler kaydedilmedi.', { file: filename(tab.file) }), t('Değişiklikleri at ve kapat'), remove);
}

function confirmDiscard(message, label, action) {
  openDialog(t('Kaydedilmemiş değişiklikler'), (body, close) => {
    body.append(el('p', '', message));
    const cancel = button('secondary-button', '', t('Vazgeç'));
    cancel.onclick = close;
    const confirm = button('button-primary', '', label);
    confirm.onclick = () => { close(); action(); };
    body.append(el('div', 'dialog-actions', cancel, confirm));
  });
}

async function saveFile() {
  const tab = openTab();
  if (!isDirty(tab) || tab.saving) return;
  tab.saving = true;
  const text = tab.text;
  renderEditorChrome();
  try {
    const result = await request('file', { method: 'PUT', body: { project: tab.project, file: tab.file, text, revision: tab.revision } });
    Object.assign(tab, result, { disk: text, conflict: '' });
    inspector?.refreshDiff();
    toast(t('{file} kaydedildi.', { file: filename(tab.file) }));
  } catch (error) {
    if (error.status === 409) tab.conflict = error.message;
    toast(error.message);
  } finally { tab.saving = false; renderEditorChrome(); }
}

async function reloadFile(tab) {
  try {
    const data = await request(query('file', { project: tab.project, file: tab.file }));
    Object.assign(tab, data, { disk: data.text, conflict: '' });
    if (openTab() === tab) editor.set(tab.text, tab.file, editor.view());
    renderEditorChrome();
  } catch (error) { toast(error.message); }
}

async function checkEditorChanges() {
  const project = editorProject;
  await Promise.all([...tabs.values()].filter((tab) => tab.project === project && !tab.saving).map(async (tab) => {
    const revision = tab.revision;
    try {
      const data = await request(query('file', { project: tab.project, file: tab.file }));
      if (tab.saving || tab.revision !== revision || data.revision === revision) return;
      if (isDirty(tab)) tab.conflict = 'Dosya diskte değişti. Kendi düzenlemeni kopyalayıp dosyayı yeniden yükle.';
      else {
        Object.assign(tab, data, { disk: data.text, conflict: '' });
        if (openTab() === tab) editor.set(tab.text, tab.file, editor.view());
      }
      renderEditorChrome();
    } catch (error) {
      if (error.status === 404 && tabs.has(tab.key)) { tab.conflict = 'Dosya diskte bulunamadı.'; renderEditorChrome(); }
    }
  }));
}

function newFileDialog() {
  const project = editorProject;
  openDialog(t('Yeni dosya'), (body, close) => {
    const form = el('form', 'dialog-body');
    form.style.padding = '0';
    const input = el('input');
    input.placeholder = t('src/yeni-dosya.js');
    input.required = true;
    const error = el('span', 'dialog-error');
    const create = el('button', 'button-primary', t('Oluştur'));
    form.onsubmit = async (event) => {
      event.preventDefault();
      create.disabled = true;
      try {
        const { file } = await request('file', { method: 'POST', body: { project, file: input.value.trim().replaceAll('\\', '/') } });
        const parts = file.split('/');
        for (let i = 1; i < parts.length; i++) expanded.add(keyFor(project, parts.slice(0, i).join('/')));
        close();
        await refreshTree();
        await openFile(project, file);
        $('code-input').focus();
      } catch (problem) { error.textContent = problem.message; }
      finally { create.disabled = false; }
    };
    form.append(field(t('Projeye göre dosya yolu'), input), error, el('div', 'dialog-actions', create));
    body.append(form);
  });
}

function bindApp() {
  for (const node of document.querySelectorAll('[data-icon]')) node.prepend(icon(node.dataset.icon));
  $('workspace-button').onclick = projectMenu;
  $('add-project').onclick = () => projectDialog();
  $('connections').onclick = connectionsDialog;
  $('settings').onclick = appearanceDialog;
  $('add-agent').onclick = $('sidebar-add-agent').onclick = () => agentDialog();
  $('save').onclick = saveFile;
  $('tree-refresh').onclick = () => { refreshTree(); checkEditorChanges(); };
  $('tree-search').oninput = renderTree;
  $('file-reload').onclick = () => {
    const tab = openTab();
    if (!tab) return;
    if (isDirty(tab)) confirmDiscard(t('{file} diskteki son haliyle açılacak.', { file: filename(tab.file) }), t('Diske dön'), () => reloadFile(tab));
    else reloadFile(tab);
  };
  $('new-file').onclick = newFileDialog;
  $('editor-toggle').onclick = () => { editorVisible = !editorVisible; renderGlobal(); saveView(); };
  $('sidebar-toggle').onclick = () => $('app').classList.toggle('sidebar-open');
  const view = (mode) => {
    viewMode = mode;
    if (mode === 'orchestrator') {
      if (!agentOf(orchestration.leaderId)) { chooseOrchestrator(selectedId); return; }
      selectedId = orchestration.leaderId;
    }
    renderGlobal();
    renderAgents();
    saveView();
  };
  $('view-single').onclick = () => view('single');
  $('view-split').onclick = () => view('split');
  $('view-orchestrator').onclick = () => view('orchestrator');
  $('orchestrator-select').onchange = () => chooseOrchestrator($('orchestrator-select').value);
  $('orchestrator-team').onclick = workerTeamDialog;
  document.addEventListener('pointerdown', (event) => {
    if (popAnchor && !popAnchor.contains(event.target) && !$('popover').contains(event.target)) closePopover();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && popAnchor) closePopover(true);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveFile(); }
  });
  window.addEventListener('resize', positionPopover);
  window.addEventListener('focus', checkEditorChanges);
  window.setInterval(() => { if (!document.hidden) checkEditorChanges(); }, 2500);
  window.addEventListener('beforeunload', (event) => {
    if ([...tabs.values()].some(isDirty) || busy.size || queuedHandoffs.size) { event.preventDefault(); event.returnValue = ''; }
  });
  const grip = $('resizer');
  function resize(value) {
    width = Math.min(65, Math.max(23, value));
    $('app').style.setProperty('--editor-width', `${width}%`);
    grip.setAttribute('aria-valuenow', Math.round(width));
  }
  grip.setAttribute('aria-valuemin', 23);
  grip.setAttribute('aria-valuemax', 65);
  grip.addEventListener('pointerdown', (event) => { grip.setPointerCapture(event.pointerId); grip.classList.add('dragging'); });
  grip.addEventListener('pointermove', (event) => { if (grip.hasPointerCapture(event.pointerId)) resize(100 * (innerWidth - event.clientX) / innerWidth); });
  grip.addEventListener('lostpointercapture', () => { grip.classList.remove('dragging'); saveView(); });
  grip.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    resize(width + (event.key === 'ArrowLeft' ? 2 : -2));
    saveView();
  });
}

async function init() {
  bindApp();
  inspector = bindInspector({ request, query, project: () => editorProject, changed(panel) { rightPanel = panel; saveView(); } });
  try {
    const state = await request('state');
    projects = state.projects;
    availableTools = state.tools || [];
    const view = state.view || {};
    setLocale(view.locale);
    localizePage();
    if (Array.isArray(view.modelProfiles)) for (const [key, values] of view.modelProfiles) modelProfiles.set(key, values);
    if (['terminal', 'standard'].includes(view.appearance?.mode)) appearance.mode = view.appearance.mode;
    for (const mode of ['terminal', 'standard']) if (Object.hasOwn(palettes, view.appearance?.palettes?.[mode])) appearance.palettes[mode] = view.appearance.palettes[mode];
    editorProject = projectOf(view.editorProject)?.id || projects[0].id;
    rightPanel = view.rightPanel || 'editor';
    if (Array.isArray(view.agents)) {
      for (const entry of view.agents) if (providers[entry.provider] && projectOf(entry.project)) agents.push({ ...entry, state: 'idle' });
    }
    if (!agents.length) agents.push(freshAgent('codex', editorProject), freshAgent('claude', editorProject));
    selectedId = agentOf(view.selectedId)?.id || agents[0].id;
    if (agentOf(view.orchestration?.leaderId)) {
      orchestration.leaderId = view.orchestration.leaderId;
      if (Array.isArray(view.orchestration.workerIds)) orchestration.workerIds = view.orchestration.workerIds.filter((id) => id !== orchestration.leaderId && agentOf(id)).slice(0, 7);
      if (Array.isArray(view.orchestration.jobs)) orchestration.jobs = view.orchestration.jobs.slice(-24).map((job) => ({ ...job, status: job.status === 'running' ? 'interrupted' : job.status }));
    }
    viewMode = view.viewMode === 'orchestrator' && orchestration.leaderId ? 'orchestrator' : view.viewMode === 'split' ? 'split' : 'single';
    if (viewMode === 'orchestrator') selectedId = orchestration.leaderId;
    editorVisible = view.editorVisible ?? editorVisible;
    width = Math.min(65, Math.max(23, view.width || width));
    $('resizer').setAttribute('aria-valuenow', Math.round(width));
    renderGlobal();
    renderAgents();
    inspector.setup(rightPanel, state.preview);
    const firstFile = view.activeFile || projectOf(editorProject)?.initialFile;
    if (firstFile) {
      const dirs = firstFile.split('/').slice(0, -1);
      dirs.forEach((_, index) => expanded.add(keyFor(editorProject, dirs.slice(0, index + 1).join('/'))));
    }
    refreshTree();
    refreshCatalogs();
    if (firstFile) await openFile(editorProject, firstFile, false);
  } catch (error) {
    $('agent-grid').replaceChildren(el('div', 'welcome', el('h2', '', t('Konsey açılamadı')), el('p', '', error.message)));
  }
}

init();
