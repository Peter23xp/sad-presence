import { Router } from 'express';
import db from '../db/database';

const router = Router();

// GET /api/employes
router.get('/', (req, res, next) => {
  try {
    const statut = req.query.statut as string || 'actif';
    const employes = statut === 'all'
      ? db.prepare('SELECT * FROM employes ORDER BY nom').all()
      : db.prepare('SELECT * FROM employes WHERE statut = ? ORDER BY nom').all(statut);
    res.json(employes);
  } catch (err) { next(err); }
});

// GET /api/employes/:numero_id
router.get('/:numero_id', (req, res, next) => {
  try {
    const employe = db.prepare('SELECT * FROM employes WHERE numero_id = ?').get(req.params.numero_id);
    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé', code: 404 });
    }
    res.json(employe);
  } catch (err) {
    next(err);
  }
});

// POST /api/employes/import
router.post('/import', (req, res, next) => {
  try {
    const employes = req.body;
    if (!Array.isArray(employes)) {
      return res.status(400).json({ error: 'Le corps de la requête doit être un tableau', code: 400 });
    }

    const insertOrUpdate = db.prepare(`
      INSERT INTO employes (numero_id, nom, prenom, sexe, poste, departement, email, telephone, localisation, statut)
      VALUES (@numero_id, @nom, @prenom, @sexe, @poste, @departement, @email, @telephone, @localisation, COALESCE(@statut, 'actif'))
      ON CONFLICT(numero_id) DO UPDATE SET
        nom=excluded.nom,
        prenom=excluded.prenom,
        sexe=excluded.sexe,
        poste=excluded.poste,
        departement=excluded.departement,
        email=excluded.email,
        telephone=excluded.telephone,
        localisation=excluded.localisation,
        statut=excluded.statut,
        date_modification=datetime('now')
    `);

    const importMany = db.transaction((emps: any[]) => {
      let count = 0;
      for (const emp of emps) {
        if (!emp.numero_id || !emp.nom) continue;
        insertOrUpdate.run({
          numero_id: emp.numero_id,
          nom: emp.nom,
          prenom: emp.prenom || '',
          sexe: emp.sexe || null,
          poste: emp.poste || null,
          departement: emp.departement || null,
          email: emp.email || null,
          telephone: emp.telephone || null,
          localisation: emp.localisation || null,
          statut: emp.statut || 'actif'
        });
        count++;
      }
      return count;
    });

    const count = importMany(employes);
    res.json({ message: `${count} employés importés ou mis à jour avec succès` });
  } catch (err) {
    next(err);
  }
});

// PUT /api/employes/:id
router.put('/:id', (req, res, next) => {
  try {
    const { nom, prenom, sexe, poste, departement, email, telephone, localisation, statut } = req.body;
    const updateStmt = db.prepare(`
      UPDATE employes
      SET nom = ?, prenom = ?, sexe = ?, poste = ?, departement = ?, email = ?, telephone = ?, localisation = ?, statut = ?, date_modification = datetime('now')
      WHERE id = ?
    `);

    const result = updateStmt.run(nom, prenom, sexe || null, poste, departement, email, telephone, localisation || null, statut || 'actif', req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employé non trouvé', code: 404 });
    }
    
    const employe = db.prepare('SELECT * FROM employes WHERE id = ?').get(req.params.id);
    res.json(employe);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/employes/:id
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare("UPDATE employes SET statut = 'inactif', date_modification = datetime('now') WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employé non trouvé', code: 404 });
    }
    res.json({ message: 'Employé désactivé avec succès' });
  } catch (err) {
    next(err);
  }
});

export default router;
