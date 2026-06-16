const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');

// ── Instance unique ─────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let serverStarted = false;

const isDev = !app.isPackaged;
const SERVER_PORT = 3001;

// ── Attendre que le serveur réponde ─────────────────────────────────────────
function waitForServer(timeout = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
        if (res.statusCode < 500) return resolve();
        setTimeout(check, 600);
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Le serveur n\'a pas démarré à temps.'));
        setTimeout(check, 600);
      });
      req.setTimeout(1000, () => { req.destroy(); setTimeout(check, 600); });
    };
    check();
  });
}

// ── Démarrer le serveur Express intégré ─────────────────────────────────────
function startServer() {
  if (isDev) return Promise.resolve(); // en dev le serveur tourne séparément
  if (serverStarted) return waitForServer();
  serverStarted = true;

  // En production : charger le serveur compilé directement dans le process
  // (pas de spawn — évite le problème "introuvable" avec process.execPath)
  const resourcesPath = process.resourcesPath;
  const serverEntry = path.join(resourcesPath, 'server', 'dist', 'index.js');

  // Les node_modules du serveur sont dans resources/server/node_modules
  const nodeModulesPath = path.join(resourcesPath, 'server', 'node_modules');
  process.env.NODE_PATH = nodeModulesPath;
  require('module').Module._initPaths();

  // Variables d'env pour le serveur
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(SERVER_PORT);
  process.env.DB_PATH = path.join(app.getPath('userData'), 'sad_presence.db');
  // Le serveur sert aussi le frontend React
  process.env.CLIENT_DIST_PATH = path.join(app.getAppPath(), 'client', 'dist');

  try {
    require(serverEntry);
  } catch (err) {
    return Promise.reject(new Error(`Erreur démarrage serveur: ${err.message}\n${err.stack}`));
  }

  return waitForServer();
}

// ── Créer la fenêtre principale ──────────────────────────────────────────────
async function createWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false, // on attend le 'ready-to-show'
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'SAD-International — Gestion de Présence',
    backgroundColor: '#f8fafc',
  });

  // Afficher seulement quand le rendu est prêt (évite l'écran blanc)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Ouvrir les liens http/https externes dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await mainWindow.loadURL(`http://localhost:5173`);
    mainWindow.webContents.openDevTools();
  } else {
    // En production : tout passe par le serveur Express (API + frontend)
    // Ça résout les appels /api/* qui sinon pointent vers file:///api/*
    await mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  }
}

// ── Événements app ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startServer();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox('SAD-Presence — Erreur', String(err.message || err));
    app.quit();
  }
});

// Si une deuxième instance essaie de s'ouvrir : focus sur la fenêtre existante
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// Nettoyage propre à la fermeture
app.on('before-quit', () => {
  // Le serveur tourne dans le même process — il s'arrête automatiquement
});
