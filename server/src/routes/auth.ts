import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sad-international-secret-2024';

function generateRecoveryKey(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let key = '';
  for (let i = 0; i < 14; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// GET /api/auth/status — vérifie si un compte existe déjà
router.get('/status', (_req: Request, res: Response) => {
  const row = db.prepare('SELECT id, first_login, username FROM auth WHERE id = 1').get() as any;
  res.json({
    initialized: !!row,
    first_login: row ? row.first_login === 1 : true,
    username: row ? row.username : null
  });
});

// POST /api/auth/setup — première connexion : crée le compte
router.post('/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const existing = db.prepare('SELECT id FROM auth WHERE id = 1').get();
    if (existing) {
      return res.status(400).json({ error: 'Compte déjà configuré' });
    }

    const recoveryKey = generateRecoveryKey();
    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryHash = await bcrypt.hash(recoveryKey, 10);

    db.prepare(`
      INSERT INTO auth (id, username, password_hash, recovery_key_hash, recovery_key_used, first_login)
      VALUES (1, ?, ?, ?, 0, 0)
    `).run(username, passwordHash, recoveryHash);

    const token = jwt.sign({ id: 1, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username, recoveryKey });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const row = db.prepare('SELECT * FROM auth WHERE id = 1').get() as any;

    if (!row) {
      return res.status(404).json({ error: 'Aucun compte configuré', setup_required: true });
    }

    if (row.username !== username) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign({ id: 1, username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/recover — utilise la clé de récupération (usage unique)
router.post('/recover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recovery_key, new_password } = req.body;
    if (!recovery_key || !new_password) {
      return res.status(400).json({ error: 'Clé de récupération et nouveau mot de passe requis' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const row = db.prepare('SELECT * FROM auth WHERE id = 1').get() as any;
    if (!row) {
      return res.status(404).json({ error: 'Aucun compte configuré' });
    }
    if (row.recovery_key_used === 1) {
      return res.status(400).json({ error: 'La clé de récupération a déjà été utilisée' });
    }

    const valid = await bcrypt.compare(recovery_key, row.recovery_key_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Clé de récupération invalide' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    db.prepare(`
      UPDATE auth SET password_hash = ?, recovery_key_used = 1, date_modification = datetime('now') WHERE id = 1
    `).run(newHash);

    const token = jwt.sign({ id: 1, username: row.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: row.username, message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password — change le mot de passe (authentifié)
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    jwt.verify(authHeader.slice(7), JWT_SECRET);

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const row = db.prepare('SELECT * FROM auth WHERE id = 1').get() as any;
    const valid = await bcrypt.compare(current_password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    db.prepare(`UPDATE auth SET password_hash = ?, date_modification = datetime('now') WHERE id = 1`).run(newHash);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-username
router.post('/change-username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
    jwt.verify(authHeader.slice(7), JWT_SECRET);
    const { new_username, password } = req.body;
    if (!new_username || !password) return res.status(400).json({ error: 'Nouveau nom et mot de passe requis' });
    const row = db.prepare('SELECT * FROM auth WHERE id = 1').get() as any;
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });
    db.prepare("UPDATE auth SET username = ?, date_modification = datetime('now') WHERE id = 1").run(new_username);
    res.json({ message: 'Nom d\'utilisateur modifié avec succès' });
  } catch (err) { next(err); }
});

// POST /api/auth/generate-recovery — génère une nouvelle clé de récupération (authentifié)
router.post('/generate-recovery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    jwt.verify(authHeader.slice(7), JWT_SECRET);

    const recoveryKey = generateRecoveryKey();
    const recoveryHash = await bcrypt.hash(recoveryKey, 10);
    db.prepare(`
      UPDATE auth SET recovery_key_hash = ?, recovery_key_used = 0, date_modification = datetime('now') WHERE id = 1
    `).run(recoveryHash);

    res.json({ recoveryKey });
  } catch (err) {
    next(err);
  }
});

export default router;
export { JWT_SECRET };
