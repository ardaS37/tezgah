import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const create = (tag, css, text = '') => Object.assign(document.createElement(tag), { className: css, textContent: text });
const views = { editor: 'editing-view', diff: 'diff-view', web: 'preview-view' };

export function bindInspector({ request, query, project, changed }) {
  let current = 'editor';
  let hasPreview = false;
  let selectedFile = '';
  let selectedProject;
  let diffLoad = 0;
  let previewFrame;
  let previewVisible = false;
  let previousBounds = '';
  let previewRequest = Promise.resolve();
  let lastPreviewState;

  async function showDiff(file, token) {
    const panel = $('diff-document');
    panel.replaceChildren(create('div', 'panel-placeholder', t('Diff yükleniyor…')));
    try {
      const result = await request(query('diff', { project: project(), file }));
      if (token !== diffLoad) return;
      const document = create('pre', 'unified-diff');
      document.setAttribute('aria-label', t('{file} Git diff’i', { file }));
      for (const line of t(result.diff).replace(/\r\n/g, '\n').split('\n')) {
        const theme = /^(diff --git|index |--- |\+\+\+ )/.test(line) ? 'header' : line.startsWith('@@') ? 'hunk' : line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : '';
        document.append(create('span', `diff-line ${theme}`, line || ' '));
      }
      panel.replaceChildren(create('div', 'diff-heading', result.oldPath ? `${result.oldPath} → ${file}` : file));
      if (result.diff) panel.append(document);
      else panel.append(create('div', 'panel-placeholder', t('Çalışma kopyasının son commit’e göre net farkı yok.')));
      if (result.truncated) panel.append(create('div', 'diff-heading', t('Diff’in ilk bölümü gösteriliyor.')));
    } catch (error) { if (token === diffLoad) panel.replaceChildren(create('div', 'panel-placeholder', error.message)); }
  }

  function selectChange(file, rows) {
    selectedFile = file;
    for (const row of rows) row.setAttribute('aria-pressed', row.dataset.path === file);
    showDiff(file, ++diffLoad);
  }

  async function refreshDiff() {
    if (current !== 'diff') return;
    const id = project();
    if (id !== selectedProject) { selectedProject = id; selectedFile = ''; }
    const token = ++diffLoad;
    const list = $('diff-files');
    const panel = $('diff-document');
    try {
      const result = await request(query('changes', { project: id }));
      if (token !== diffLoad || current !== 'diff') return;
      if (!result.files.length) {
        list.replaceChildren();
        panel.replaceChildren(create('div', 'panel-placeholder', result.repository ? t('Çalışma kopyasında değişiklik yok.') : t('Bu klasörde Git deposu yok.')));
        return;
      }
      const rows = result.files.map((entry) => {
        const row = create('button', 'diff-file');
        row.type = 'button';
        row.dataset.path = entry.path;
        row.title = entry.path;
        row.append(create('span', 'diff-status', entry.status.replaceAll(' ', '·')), create('span', 'diff-name', entry.path));
        row.onclick = () => selectChange(entry.path, rows);
        return row;
      });
      list.replaceChildren(...rows);
      if (result.truncated) list.append(create('div', 'diff-heading', t('İlk 700 dosya gösteriliyor.')));
      selectChange(result.files.some((entry) => entry.path === selectedFile) ? selectedFile : result.files[0].path, rows);
    } catch (error) {
      if (token !== diffLoad) return;
      list.replaceChildren();
      panel.replaceChildren(create('div', 'panel-placeholder', error.message));
    }
  }

  const previewBounds = () => {
    const rect = $('preview-surface').getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  };
  const displayPreview = () => hasPreview && current === 'web' && !$('app').classList.contains('editor-hidden') && !$('dialog').open && $('popover').hidden;

  function updatePreview(state) {
    lastPreviewState = state;
    const address = $('preview-address');
    if (document.activeElement !== address && state.url && state.url !== 'about:blank' && !state.loading) address.value = state.url;
    $('preview-back').disabled = !state.back;
    $('preview-forward').disabled = !state.forward;
    $('preview-reload').disabled = !state.url && !state.status;
    const message = state.status ? t(state.status, state.statusValues && { reason: state.statusValues.reason || t('bağlantı hatası') }) : (state.loading ? t('Yükleniyor…') : '');
    $('preview-status').textContent = message;
    $('preview-status').hidden = !message;
    $('preview-placeholder').hidden = !!state.url && !state.status;
    $('preview-placeholder').textContent = state.status ? message : t('Önizlemek için yerel uygulamanın adresini yaz.');
  }

  function previewAction(action, options = {}) {
    previewRequest = previewRequest.catch(() => {}).then(() => request('preview', { method: 'POST', body: { action, ...options } })).then(updatePreview).catch((error) => {
      $('preview-status').textContent = error.message;
      $('preview-status').hidden = false;
    });
  }

  function syncPreview() {
    if (!hasPreview) return;
    cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(() => {
      const visible = displayPreview();
      const bounds = visible ? previewBounds() : null;
      const key = JSON.stringify(bounds);
      if (visible && (!previewVisible || key !== previousBounds)) previewAction('show', { bounds });
      if (!visible && previewVisible) previewAction('hide');
      previewVisible = visible;
      previousBounds = key;
    });
  }

  function select(panel, persist = true) {
    current = Object.hasOwn(views, panel) ? panel : 'editor';
    ++diffLoad;
    for (const [id, container] of Object.entries(views)) {
      $(`right-${id}`).setAttribute('aria-selected', current === id);
      $(container).hidden = current !== id;
    }
    $('editing-actions').hidden = current !== 'editor';
    $('diff-actions').hidden = current !== 'diff';
    if (current === 'diff') refreshDiff();
    syncPreview();
    if (persist) changed(current);
  }

  for (const key of Object.keys(views)) $(`right-${key}`).onclick = () => select(key);
  $('refresh-diff').onclick = refreshDiff;
  for (const action of ['back', 'forward', 'reload']) $(`preview-${action}`).onclick = () => {
    if (action === 'reload' && $('preview-placeholder').textContent && !$('preview-placeholder').hidden) $('preview-form').requestSubmit();
    else previewAction(action);
  };
  $('preview-form').onsubmit = (event) => {
    event.preventDefault();
    if (!hasPreview) return;
    const input = $('preview-address');
    const value = input.value.trim();
    if (!value) return;
    const prefix = /^(localhost|127\.0\.0\.1|\[::1\])(?:[/:]|$)/i.test(value) ? 'http://' : 'https://';
    const url = value.includes('://') ? value : prefix + value;
    input.blur();
    previewAction('open', { url, bounds: previewBounds() });
  };
  const resize = new ResizeObserver(syncPreview);
  resize.observe($('preview-surface'));
  window.addEventListener('resize', syncPreview);
  window.addEventListener('focus', refreshDiff);
  const observer = new MutationObserver(syncPreview);
  observer.observe($('dialog'), { attributes: true, attributeFilter: ['open'] });
  observer.observe($('popover'), { attributes: true, attributeFilter: ['hidden'] });
  observer.observe($('app'), { attributes: true, attributeFilter: ['class'] });
  window.setInterval(() => {
    if (previewVisible && !document.hidden) request('preview').then(updatePreview).catch(() => {});
  }, 700);

  return {
    refreshDiff, select,
    refreshLanguage() {
      if (!hasPreview) $('preview-placeholder').textContent = t('Web önizlemeyi Electron geliştirme penceresinde kullanabilirsin.');
      else if (lastPreviewState) updatePreview(lastPreviewState);
      refreshDiff();
    },
    setup(panel, able) {
      hasPreview = able;
      if (!able) {
        $('preview-placeholder').textContent = t('Web önizlemeyi Electron geliştirme penceresinde kullanabilirsin.');
        $('preview-address').disabled = true;
        $('preview-form').querySelector('button[type="submit"]').disabled = true;
      }
      select(panel, false);
    },
  };
}
