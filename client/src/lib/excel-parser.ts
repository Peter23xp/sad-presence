import * as XLSX from 'xlsx';

export interface EmployeImport {
  numero_id: string;
  nom: string;
  prenom: string;
  sexe?: string;
  poste?: string;
  departement?: string;
  email?: string;
  telephone?: string;
  localisation?: string;
  _valid: boolean;
  _errors: string[];
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'string') {
        const val = cell.v.trim().toLowerCase().replace(/[°\s]+/g, ' ');
        if (val.includes('n id') || val === 'nid' || val === 'id' || val.includes('numero')) {
          return r;
        }
      }
    }
  }
  return 0;
}

export const parseEmployesExcel = (file: File): Promise<EmployeImport[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const headerRow = findHeaderRow(worksheet);
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          range: headerRow
        });

        const results: EmployeImport[] = rawData.map((row) => {
          const errors: string[] = [];

          const findKey = (possibleNames: string[]) => {
            const keys = Object.keys(row);
            const foundKey = keys.find(k => {
              const normalized = k.trim().toLowerCase().replace(/[°\s]+/g, ' ').trim();
              return possibleNames.some(pn => normalized === pn.toLowerCase() || normalized.includes(pn.toLowerCase()));
            });
            return foundKey ? row[foundKey]?.toString().trim() : '';
          };

          const numero_id = findKey(["n id", "nid", "id", "numero id", "numero"]);
          const nomComplet = findKey(["nom & post-nom", "nom & postnom", "nom et post-nom", "nom et postnom", "nom complet"]);
          const nomSeul = findKey(["nom"]);
          const prenomSeul = findKey(["pr nom", "prenom"]);
          const sexe = findKey(["sexe"]);
          const poste = findKey(["fonction", "poste"]);
          const departement = findKey(["departement", "d partement"]);
          const telephoneRaw = findKey(["telephone", "tel", "n telephone"]);
          const localisation = findKey(["localisation", "lieu", "site"]);
          const email = findKey(["email", "e-mail", "mail"]);

          let nom = '';
          let prenom = '';

          if (nomComplet) {
            const parts = nomComplet.split(/\s+/);
            if (parts.length >= 2) {
              prenom = parts[parts.length - 1];
              nom = parts.slice(0, -1).join(' ');
            } else {
              nom = nomComplet;
              prenom = '';
            }
          } else {
            nom = nomSeul;
            prenom = prenomSeul;
          }

          let telephone = telephoneRaw;
          if (telephone && /^\d{12}$/.test(telephone)) {
            telephone = '+' + telephone;
          }

          if (!numero_id) errors.push("N°ID manquant");
          if (!nom) errors.push("Nom manquant");

          return {
            numero_id,
            nom,
            prenom,
            sexe: sexe || undefined,
            poste,
            departement,
            email,
            telephone,
            localisation: localisation || undefined,
            _valid: errors.length === 0,
            _errors: errors
          } as EmployeImport;
        });

        const filteredResults = results.filter(r =>
          r.numero_id || r.nom || r.prenom || r.poste || r.departement || r.email || r.telephone
        );

        resolve(filteredResults);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file); // type: 'array' attend un ArrayBuffer
  });
};

export const generateTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["N°ID", "NOM & POST-NOM", "SEXE", "DEPARTEMENT", "FONCTION", "N° TELEPHONE", "LOCALISATION"],
    ["SAD-I 001", "DUPONT Jean", "M", "DIRECTION", "Directeur", "243000000000", "BUREAU PAYS"]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employes");
  XLSX.writeFile(wb, "SAD_Modele_Employes.xlsx");
};
