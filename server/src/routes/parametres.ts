import { Router } from 'express';
import db from '../db/database';

const router = Router();

// GET /api/parametres
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM parametres').all() as any[];
    const parametres: any = {};
    rows.forEach((row) => {
      parametres[row.cle] = row.valeur;
    });
    res.json(parametres);
  } catch (err) {
    next(err);
  }
});

// PUT /api/parametres
router.put('/', (req, res, next) => {
  try {
    const params = req.body;
    if (typeof params !== 'object' || Array.isArray(params)) {
      return res.status(400).json({ error: 'Corps de la requête invalide', code: 400 });
    }

    const updateStmt = db.prepare('INSERT OR REPLACE INTO parametres (cle, valeur) VALUES (?, ?)');
    
    const updateMany = db.transaction((parametresObj: any) => {
      for (const [cle, valeur] of Object.entries(parametresObj)) {
        updateStmt.run(cle, String(valeur));
      }
    });

    updateMany(params);
    res.json({ message: 'Paramètres mis à jour avec succès' });
  } catch (err) {
    next(err);
  }
});

export default router;
