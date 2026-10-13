const { app, BrowserWindow, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const START_URL = 'https://mc.kurogames.com/cloud/#/';
const SESSION_PARTITION = 'persist:yun-mingchao-cloud';
const APP_ID = 'dev.local.yunmingchao.desktop';
// Set this before creating any windows, including the login SDK's subframes.
// Electron's default user agent includes the Chinese product name, which the
// official SDK cannot encode and some HTTP servers cannot accept.
const BROWSER_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
app.userAgentFallback = BROWSER_USER_AGENT;

let mainWindow = null;

app.setPath('userData', path.join(app.getPath('appData'), 'YunMingchaoDesktop'));

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isAllowedGamePermission(contents, permission, requestingUrl) {
  if (!contents || contents.isDestroyed()) return false;
  if (!['clipboard-sanitized-write', 'pointerLock'].includes(permission)) return false;
  try {
    const page = new URL(contents.getURL());
    const requester = new URL(requestingUrl || contents.getURL());
    return page.origin === 'https://mc.kurogames.com' &&
      requester.origin === 'https://mc.kurogames.com';
  } catch {
    return false;
  }
}

function makeWindowOptions(isPopup = false) {
  return {
    title: '云·鸣潮',
    width: isPopup ? 1100 : 1440,
    height: isPopup ? 800 : 900,
    minWidth: isPopup ? 720 : 960,
    minHeight: isPopup ? 560 : 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08090d',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    fullscreenable: true,
    webPreferences: {
      partition: SESSION_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      // HTML fullscreen may end on Escape without changing native F11 fullscreen.
      disableHtmlFullscreenWindowResize: true,
      devTools: !app.isPackaged
    }
  };
}

function attachWebContents(contents) {
  contents.setUserAgent(BROWSER_USER_AGENT);
  contents.setWindowOpenHandler(({ url }) => {
    // Keep login and other HTTPS flows inside the client. Never let a remote page
    // open a local file or a custom protocol through an Electron window.
    if (!isWebUrl(url)) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: makeWindowOptions(true)
    };
  });

  contents.on('will-navigate', (event, url) => {
    if (!isWebUrl(url)) event.preventDefault();
  });

  contents.on('will-redirect', (event, url) => {
    if (!isWebUrl(url)) event.preventDefault();
  });

  contents.on('did-create-window', (childWindow) => {
    childWindow.setMenuBarVisibility(false);
    childWindow.once('ready-to-show', () => childWindow.show());
    attachWebContents(childWindow.webContents);
  });

  contents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();
    const command = input.control || input.meta;

    if (input.type !== 'keyDown') return;

    if (input.key === 'F11') {
      const win = BrowserWindow.fromWebContents(contents);
      if (win && !input.isAutoRepeat) win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'F5') {
      contents.reload();
      event.preventDefault();
    } else if (command && key === 'r') {
      if (input.shift) contents.reloadIgnoringCache();
      else contents.reload();
      event.preventDefault();
    } else if (command && key === '0') {
      contents.setZoomLevel(0);
      event.preventDefault();
    } else if (command && (key === '+' || key === '=' || key === '-')) {
      const delta = key === '-' ? -1 : 1;
      contents.setZoomLevel(contents.getZoomLevel() + delta);
      event.preventDefault();
    } else if (input.alt && input.key === 'ArrowLeft' && contents.canGoBack()) {
      contents.goBack();
      event.preventDefault();
    } else if (input.alt && input.key === 'ArrowRight' && contents.canGoForward()) {
      contents.goForward();
      event.preventDefault();
    }
  });

}

function configureSession(appSession) {
  appSession.setUserAgent(BROWSER_USER_AGENT);
  const logPath = path.join(app.getPath('userData'), 'network-diagnostics.log');
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(logPath, `Version ${app.getVersion()}\n`);
  const logFailure = (details) => {
    const url = new URL(details.url);
    // Never record query strings, headers, request bodies, or account data.
    if (!['kurogames.com', 'aki-game.com', 'aki-game2.com'].some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    )) return;
    const result = details.error || `HTTP ${details.statusCode}`;
    fs.appendFile(logPath,
      `${new Date().toISOString()} ${details.method} ${url.origin}${url.pathname} ${result}\n`,
      () => {});
  };
  appSession.webRequest.onErrorOccurred(logFailure);
  appSession.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400) logFailure(details);
  });
  // Let the official game manage pointer capture and Alt-to-release itself.
  // Both permission paths enforce the same policy, including subframe origins.
  appSession.setPermissionCheckHandler((contents, permission, requestingOrigin, details) => {
    return isAllowedGamePermission(contents, permission,
      details?.requestingUrl || requestingOrigin);
  });
  appSession.setPermissionRequestHandler((contents, permission, callback, details) => {
    callback(isAllowedGamePermission(contents, permission, details?.requestingUrl));
  });
}

function createWindow() {
  const win = new BrowserWindow(makeWindowOptions());
  mainWindow = win;
  win.setMenuBarVisibility(false);

  attachWebContents(win.webContents);
  // A stalled request must not leave the entire client invisible.
  const showTimer = setTimeout(() => {
    if (!win.isDestroyed()) win.show();
  }, 5000);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    clearTimeout(showTimer);
    if (mainWindow === win) mainWindow = null;
  });

  win.loadURL(START_URL);
  return win;
}

Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  const appSession = session.fromPartition(SESSION_PARTITION);
  configureSession(appSession);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

