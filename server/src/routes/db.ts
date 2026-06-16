import { Router } from 'express';
import db from '../db/database';
import path from 'path';

const router = Router();

router.get('/backup', (req, res, next) => {
  try {
    const dbPath = path.resolve(__dirname, '../../sad_presence.db');
    res.download(dbPath, `backup_sad_presence_${new Date().toISOString().split('T')[0]}.db`);
  } catch (err) {
    next(err);
  }
});

router.post('/reset', (req, res, next) => {
  try {
    db.exec(`
      DELETE FROM presences;
      DELETE FROM employes;
      DELETE FROM sqlite_sequence WHERE name IN ('presences', 'employes');
    `);
    
    const seedEmployes = db.prepare(`
      INSERT INTO employes (numero_id, nom, prenom, poste, departement, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    seedEmployes.run('1001', 'Ilunga', 'Jean', 'Développeur', 'IT', 'jean.ilunga@sad.com');
    seedEmployes.run('1002', 'Kasongo', 'Marie', 'RH', 'Ressources Humaines', 'marie.kasongo@sad.com');
    seedEmployes.run('1003', 'Muteba', 'Paul', 'Comptable', 'Finance', 'paul.muteba@sad.com');
    
    res.json({ message: 'Base de données réinitialisée avec les données de test.' });
  } catch (err) {
    next(err);
  }
});

export default router;
