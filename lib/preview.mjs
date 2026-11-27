import { WebContentsView } from 'electron';

function webAddress(value) {
  let address;
  try { address = new URL(value); } catch { throw new Error('Bir HTTP veya HTTPS adresi gir.'); }
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password) throw new Error('Bir HTTP veya HTTPS adresi gir.');
  return address.href;
}

export function createPreview(owner) {
  let view;
  let active = false;
  let navigation = 0;
  let status = '';
  let statusValues;

  function state() {
    const contents = view?.webContents;
    const history = contents?.navigationHistory;
    return {
      url: contents?.getURL() || '', loading: contents?.isLoading() || false,
      back: history?.canGoBack() || false, forward: history?.canGoForward() || false,
      status, statusValues,
    };
  }

  function surface(window) {
    if (view) return view;
    view = new WebContentsView({ webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, partition: 'tezgah-preview' } });
    view.setBackgroundColor('#15171b');
    view.setVisible(false);
    const contents = view.webContents;
    const restrict = (event) => { try { webAddress(event.url); } catch { event.preventDefault(); } };
    contents.on('will-frame-navigate', restrict);
    contents.on('will-redirect', restrict);
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.session.setPermissionCheckHandler(() => false);
    contents.session.setPermissionRequestHandler((_sender, _permission, callback) => callback(false));
    contents.session.on('will-download', (event) => event.preventDefault());
    window.contentView.addChildView(view);
    return view;
  }

  function boundsFor(window, bounds) {
    if (!bounds || !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key]))) throw new Error('Geçersiz önizleme alanı.');
    const [maxX, maxY] = window.getContentSize();
    const x = Math.max(0, Math.min(maxX, Math.round(bounds.x)));
    const y = Math.max(0, Math.min(maxY, Math.round(bounds.y)));
    return { x, y, width: Math.max(0, Math.min(maxX - x, Math.round(bounds.width))), height: Math.max(0, Math.min(maxY - y, Math.round(bounds.height))) };
  }

  return {
    state,
    async act({ action, bounds, url }) {
      const window = owner();
      if (!window || window.isDestroyed()) throw new Error('Önizleme penceresi hazır değil.');
      if (action === 'hide') { active = false; view?.setVisible(false); return state(); }
      if (action === 'show') {
        active = true;
        if (view) { view.setBounds(boundsFor(window, bounds)); view.setVisible(!status); }
        return state();
      }
      if (!['open', 'back', 'forward', 'reload'].includes(action)) throw new Error('Geçersiz önizleme eylemi.');
      if (action === 'open') {
        const target = webAddress(url);
        const native = surface(window);
        if (bounds) native.setBounds(boundsFor(window, bounds));
        const sequence = ++navigation;
        status = '';
        statusValues = undefined;
        native.setVisible(active);
        void native.webContents.loadURL(target).catch((error) => {
          if (sequence !== navigation || error.code === 'ERR_ABORTED') return;
          status = error.code === 'ERR_CONNECTION_REFUSED' ? 'Sunucuya ulaşılamadı. Yerel geliştirme sunucusunun çalıştığını kontrol et.' : 'Sayfa açılamadı ({reason}).';
          if (error.code !== 'ERR_CONNECTION_REFUSED') statusValues = { reason: error.code };
          native.setVisible(false);
        });
        return state();
      }
      const contents = view?.webContents;
      if (!contents) return state();
      status = '';
      statusValues = undefined;
      if (action === 'back' && contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack();
      if (action === 'forward' && contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward();
      if (action === 'reload') contents.reload();
      view.setVisible(active);
      return state();
    },
    close() {
      if (view && !view.webContents.isDestroyed()) view.webContents.close();
      view = undefined;
      active = false;
    },
  };
}
