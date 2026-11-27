import path from 'node:path';
import { app, BrowserWindow, dialog, Menu } from 'electron';
import { startServer } from './server.mjs';
import { createDesktopTools } from './lib/electron-tools.mjs';
import { createPreview } from './lib/preview.mjs';
import { translate } from './ui/i18n.js';

app.setName('Tezgah');
app.setAppUserModelId('io.github.ardas37.tezgah');

let mainWindow;
let local;
let pickerOpen = false;
const desktopTools = createDesktopTools(() => mainWindow);
const preview = createPreview(() => mainWindow);

function focusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function pickFolder(locale) {
  if (!mainWindow || mainWindow.isDestroyed() || pickerOpen) return '';
  pickerOpen = true;
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: translate(locale, 'Tezgah · Proje klasörü aç'),
      buttonLabel: translate(locale, 'Klasörü seç'),
      properties: ['openDirectory'],
    });
    return result.canceled ? '' : result.filePaths[0];
  } finally { pickerOpen = false; }
}

function configureWindow(window, url) {
  const entry = new URL(url);
  const isWorkbench = (candidate) => {
    try {
      const target = new URL(candidate);
      return target.origin === entry.origin && target.pathname === '/';
    } catch { return false; }
  };
  const contents = window.webContents;
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event) => { if (!isWorkbench(event.url)) event.preventDefault(); });
  contents.on('will-redirect', (event) => { if (!isWorkbench(event.url)) event.preventDefault(); });
  contents.session.setPermissionCheckHandler((sender, permission, origin) =>
    sender === contents && origin === entry.origin && permission === 'clipboard-sanitized-write');
  contents.session.setPermissionRequestHandler((sender, permission, callback, details) =>
    callback(sender === contents && details.isMainFrame && isWorkbench(details.requestingUrl) && permission === 'clipboard-sanitized-write'));
  contents.on('will-prevent-unload', (event) => {
    const locale = local?.getLocale();
    const response = dialog.showMessageBoxSync(window, {
      type: 'warning',
      title: 'Tezgah',
      message: translate(locale, 'Tezgah kapatılsın mı?'),
      detail: translate(locale, 'Kaydedilmemiş düzenlemeler, çalışan ajanlar veya sıradaki aktarımlar var.'),
      buttons: ['Açık tut', 'Kapat'].map((label) => translate(locale, label)),
      defaultId: 0,
      cancelId: 0,
    });
    if (response === 1) event.preventDefault();
  });
}

async function open() {
  Menu.setApplicationMenu(null);
  local = await startServer({
    folderPicker: pickFolder,
    desktopTools: desktopTools.handlers,
    preview,
    exampleDir: app.isPackaged ? path.join(process.resourcesPath, 'example') : undefined,
  });

  const window = new BrowserWindow({
    title: 'Tezgah',
    icon: path.join(app.getAppPath(), 'assets', 'tezgah.ico'),
    width: 1500,
    height: 940,
    minWidth: 740,
    minHeight: 520,
    backgroundColor: '#14161b',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'tezgah-workbench',
    },
  });
  mainWindow = window;
  window.once('ready-to-show', focusWindow);
  window.on('closed', () => { mainWindow = undefined; preview.close(); desktopTools.close(); });
  configureWindow(window, local.url);
  await window.loadURL(local.url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusWindow);
  app.on('window-all-closed', async () => {
    try { await local?.close(); }
    finally { app.quit(); }
  });
  app.whenReady().then(open).catch((error) => {
    const locale = local?.getLocale();
    dialog.showErrorBox(translate(locale, 'Tezgah açılamadı'), translate(locale, error.message));
    app.exit(1);
  });
}
