import Database from 'better-sqlite3';
import path from 'path';

// Define the path to the database file
const dbPath = path.resolve(__dirname, 'sad_presence.db');

// Initialize the database
const db: import('better-sqlite3').Database = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS employes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_id TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    sexe TEXT,
    poste TEXT,
    departement TEXT,
    email TEXT,
    telephone TEXT,
    localisation TEXT,
    statut TEXT DEFAULT 'actif',
    date_creation TEXT DEFAULT (datetime('now')),
    date_modification TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS presences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employe_id INTEGER REFERENCES employes(id),
    type TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now', 'localtime')),
    date TEXT DEFAULT (date('now', 'localtime')),
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS parametres (
    cle TEXT PRIMARY KEY,
    valeur TEXT
  );
`);

// Table auth
db.exec(`
  CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL DEFAULT 'admin',
    password_hash TEXT NOT NULL,
    recovery_key_hash TEXT,
    recovery_key_used INTEGER DEFAULT 0,
    first_login INTEGER DEFAULT 1,
    date_modification TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations: add columns if they don't exist yet
const columns = db.prepare("PRAGMA table_info(employes)").all() as any[];
const columnNames = columns.map((c: any) => c.name);
if (!columnNames.includes('sexe')) {
  db.exec("ALTER TABLE employes ADD COLUMN sexe TEXT");
}
if (!columnNames.includes('localisation')) {
  db.exec("ALTER TABLE employes ADD COLUMN localisation TEXT");
}

// Insert default values into parametres if they don't exist
const insertParametre = db.prepare(`
  INSERT OR IGNORE INTO parametres (cle, valeur) VALUES (?, ?)
`);

const defaultParametres = [
  ['heure_entree', '08:00'],
  ['heure_sortie', '17:00'],
  ['tolerance_minutes', '15'],
  ['nom_entreprise', 'SAD-International'],
  ['fuseau_horaire', 'Africa/Kinshasa']
];

const insertDefaultParametres = db.transaction((params: string[][]) => {
  for (const [cle, valeur] of params) {
    insertParametre.run(cle, valeur);
  }
});

insertDefaultParametres(defaultParametres);

export default db;
