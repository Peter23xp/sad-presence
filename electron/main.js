const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;

const isDev = !app.isPackaged;
const SERVER_PORT = 3001;
const CLIENT_PORT = 5173;

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else setTimeout(check, 500);
      }).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Server timeout'));
        else setTimeout(check, 500);
      });
    };
    check();
  });
}

function startServer() {
  if (isDev) return Promise.resolve(); // en dev, le serveur tourne déjà

  const serverPath = path.join(process.resourcesPath, 'server');
  const nodePath = process.execPath; // node bundlé avec electron

  serverProcess = spawn(nodePath, [path.join(serverPath, 'dist', 'index.js')], {
    cwd: serverPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(SERVER_PORT),
      DB_PATH: path.join(app.getPath('userData'), 'sad_presence.db'),
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => console.log('[server]', d.toString()));
  serverProcess.stderr.on('data', (d) => console.error('[server]', d.toString()));

  return waitForServer(`http://localhost:${SERVER_PORT}/api/health`);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    title: 'SAD-International — Gestion de Présence',
  });

  // Ouvrir les liens externes dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await mainWindow.loadURL(`http://localhost:${CLIENT_PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox('Erreur de démarrage', String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
