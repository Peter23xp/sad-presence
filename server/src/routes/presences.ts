import { Router } from 'express';
import db from '../db/database';

const router = Router();

// POST /api/presences/scan
router.post('/scan', (req, res, next) => {
  try {
    const { numero_id } = req.body;
    if (!numero_id) {
      return res.status(400).json({ error: 'numero_id manquant', code: 400 });
    }

    const employe = db.prepare('SELECT * FROM employes WHERE numero_id = ? AND statut = ?').get(numero_id, 'actif') as any;
    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé ou inactif', code: 404 });
    }

    // Déterminer entrée ou sortie
    const dernierePresence = db.prepare(`
      SELECT type FROM presences 
      WHERE employe_id = ? AND date = date('now', 'localtime') 
      ORDER BY timestamp DESC LIMIT 1
    `).get(employe.id) as any;

    let typeAction = 'entree';
    if (dernierePresence && dernierePresence.type === 'entree') {
      typeAction = 'sortie';
    }

    const insertPresence = db.prepare(`
      INSERT INTO presences (employe_id, type)
      VALUES (?, ?)
    `);
    
    const result = insertPresence.run(employe.id, typeAction);
    const nouvellePresence = db.prepare('SELECT * FROM presences WHERE id = ?').get(result.lastInsertRowid) as any;

    res.json({
      employe,
      type: typeAction,
      timestamp: nouvellePresence.timestamp,
      message: `Pointage d'${typeAction} enregistré avec succès pour ${employe.prenom} ${employe.nom}`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/presences
router.get('/', (req, res, next) => {
  try {
    const { date, employe_id, type, debut, fin } = req.query;
    
    let query = `
      SELECT p.*, e.nom, e.prenom, e.numero_id, e.departement 
      FROM presences p
      JOIN employes e ON p.employe_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += ' AND p.date = ?';
      params.push(date);
    }
    if (employe_id) {
      query += ' AND p.employe_id = ?';
      params.push(employe_id);
    }
    if (type) {
      query += ' AND p.type = ?';
      params.push(type);
    }
    if (debut && fin) {
      query += ' AND p.date >= ? AND p.date <= ?';
      params.push(debut, fin);
    }

    query += ' ORDER BY p.timestamp DESC';
    
    const presences = db.prepare(query).all(...params);
    res.json(presences);
  } catch (err) {
    next(err);
  }
});

// GET /api/presences/today
router.get('/today', (req, res, next) => {
  try {
    const employes = db.prepare('SELECT * FROM employes WHERE statut = ?').all('actif') as any[];
    const presencesToday = db.prepare(`
      SELECT employe_id, type, timestamp 
      FROM presences 
      WHERE date = date('now', 'localtime')
      ORDER BY timestamp ASC
    `).all() as any[];

    const stats = employes.map(emp => {
      const empPresences = presencesToday.filter(p => p.employe_id === emp.id);
      let statut = 'absent';
      
      if (empPresences.length > 0) {
        const derniere = empPresences[empPresences.length - 1];
        statut = derniere.type === 'entree' ? 'present' : 'sorti';
      }

      return {
        employe: emp,
        statut,
        presences: empPresences
      };
    });

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/presences/rapport
router.get('/rapport', (req, res, next) => {
  try {
    const { debut, fin } = req.query;
    if (!debut || !fin) {
      return res.status(400).json({ error: 'Paramètres debut et fin requis (YYYY-MM-DD)', code: 400 });
    }

    const parametres = db.prepare('SELECT cle, valeur FROM parametres').all() as any[];
    const config: any = {};
    parametres.forEach(p => { config[p.cle] = p.valeur; });

    const employes = db.prepare('SELECT * FROM employes WHERE statut = ?').all('actif') as any[];
    const presences = db.prepare(`
      SELECT * FROM presences 
      WHERE date >= ? AND date <= ?
      ORDER BY timestamp ASC
    `).all(debut, fin) as any[];

    const rapport = employes.map(emp => {
      const empPresences = presences.filter(p => p.employe_id === emp.id);
      
      // Group by date
      const parJour: { [key: string]: any[] } = {};
      empPresences.forEach(p => {
        if (!parJour[p.date]) parJour[p.date] = [];
        parJour[p.date].push(p);
      });

      let joursPresents = 0;
      let retards = 0;
      let minutesTotales = 0;

      const [heureEntreeH, heureEntreeM] = (config.heure_entree || '08:00').split(':').map(Number);
      const tolerance = Number(config.tolerance_minutes || 15);

      for (const date in parJour) {
        const events = parJour[date];
        joursPresents++;

        // Calculate retard
        const firstEntree = events.find(e => e.type === 'entree');
        if (firstEntree) {
          const timestamp = new Date(firstEntree.timestamp);
          const limitTime = new Date(timestamp);
          limitTime.setHours(heureEntreeH, heureEntreeM + tolerance, 0, 0);

          if (timestamp > limitTime) {
            retards++;
          }
        }

        // Calculate duration
        let entreeTime: Date | null = null;
        for (const ev of events) {
          if (ev.type === 'entree') {
            entreeTime = new Date(ev.timestamp);
          } else if (ev.type === 'sortie' && entreeTime) {
            const sortieTime = new Date(ev.timestamp);
            const diffMin = (sortieTime.getTime() - entreeTime.getTime()) / 60000;
            minutesTotales += diffMin;
            entreeTime = null; // reset for next pair
          }
        }
      }
      
      // Calcule le nombre de jours calendaires dans la période (debut à fin)
      const debutDate = new Date(debut as string);
      const finDate = new Date(fin as string);
      const totalJours = Math.round((finDate.getTime() - debutDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const joursAbsents = Math.max(0, totalJours - joursPresents);

      return {
        employe: { id: emp.id, nom: emp.nom, prenom: emp.prenom, numero_id: emp.numero_id },
        jours_presents: joursPresents,
        jours_absents: joursAbsents,
        retards: retards,
        heures_totales: (minutesTotales / 60).toFixed(2)
      };
    });

    res.json(rapport);
  } catch (err) {
    next(err);
  }
});

// GET /api/presences/alertes
router.get('/alertes', (req, res, next) => {
  try {
    const employes = db.prepare('SELECT * FROM employes WHERE statut = ?').all('actif') as any[];
    const presencesToday = db.prepare(`
      SELECT employe_id, type, timestamp 
      FROM presences 
      WHERE date = date('now', 'localtime')
    `).all() as any[];

    const parametres = db.prepare('SELECT cle, valeur FROM parametres').all() as any[];
    const config: any = {};
    parametres.forEach(p => { config[p.cle] = p.valeur; });

    const [heureEntreeH, heureEntreeM] = (config.heure_entree || '08:00').split(':').map(Number);
    const tolerance = Number(config.tolerance_minutes || 15);

    const now = new Date(); // local server time
    const limitTime = new Date();
    limitTime.setHours(heureEntreeH, heureEntreeM + tolerance, 0, 0);

    const absents: any[] = [];
    const retardataires: any[] = [];

    employes.forEach(emp => {
      const empPresences = presencesToday.filter(p => p.employe_id === emp.id);
      
      if (empPresences.length === 0) {
        // Only mark as absent if it's past the entry limit time
        if (now > limitTime) {
          absents.push(emp);
        }
      } else {
        const firstEntree = empPresences.find(p => p.type === 'entree');
        if (firstEntree) {
          const timestamp = new Date(firstEntree.timestamp);
          if (timestamp > limitTime) {
            retardataires.push({
              employe: emp,
              heure_arrivee: timestamp.toISOString()
            });
          }
        }
      }
    });

    res.json({
      absents,
      retardataires
    });
  } catch (err) {
    next(err);
  }
});

export default router;
