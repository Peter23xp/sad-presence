import db from './database';

const seedEmployes = () => {
  // Check if we already have employees to avoid duplicate seeding
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM employes');
  const result = countStmt.get() as { count: number };
  
  if (result.count > 0) {
    console.log('Database already contains employees. Skipping seed.');
    return;
  }

  const insertEmploye = db.prepare(`
    INSERT INTO employes (numero_id, nom, prenom, poste, departement, email, telephone)
    VALUES (@numero_id, @nom, @prenom, @poste, @departement, @email, @telephone)
  `);

  const employesToSeed = [
    {
      numero_id: 'SAD-2024-001',
      nom: 'Ilunga',
      prenom: 'Jean',
      poste: 'Développeur',
      departement: 'IT',
      email: 'jean.ilunga@sad-international.com',
      telephone: '+243000000001'
    },
    {
      numero_id: 'SAD-2024-002',
      nom: 'Kabeya',
      prenom: 'Sophie',
      poste: 'Ressources Humaines',
      departement: 'RH',
      email: 'sophie.kabeya@sad-international.com',
      telephone: '+243000000002'
    },
    {
      numero_id: 'SAD-2024-003',
      nom: 'Mutombo',
      prenom: 'Marc',
      poste: 'Comptable',
      departement: 'Finance',
      email: 'marc.mutombo@sad-international.com',
      telephone: '+243000000003'
    },
    {
      numero_id: 'SAD-2024-004',
      nom: 'Ngandu',
      prenom: 'Alice',
      poste: 'Assistante de Direction',
      departement: 'Administration',
      email: 'alice.ngandu@sad-international.com',
      telephone: '+243000000004'
    },
    {
      numero_id: 'SAD-2024-005',
      nom: 'Kasongo',
      prenom: 'Luc',
      poste: 'Chef de Projet',
      departement: 'Opérations',
      email: 'luc.kasongo@sad-international.com',
      telephone: '+243000000005'
    }
  ];

  const insertMany = db.transaction((employes: any[]) => {
    for (const emp of employes) {
      insertEmploye.run(emp);
    }
  });

  insertMany(employesToSeed);
  console.log('Successfully seeded 5 test employees.');
};

seedEmployes();
