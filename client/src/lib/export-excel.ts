import * as XLSX from 'xlsx';

export const exportRapportExcel = (
  resumeData: any[],
  detailData: any[],
  alertesData: any[],
  periode: { debut: string, fin: string }
) => {
  const wb = XLSX.utils.book_new();

  // Helper to add standard header to sheets
  const addHeaderInfo = (ws: XLSX.WorkSheet) => {
    XLSX.utils.sheet_add_aoa(ws, [
      ["SAD-International - Système de Présence"],
      [`Période: du ${periode.debut} au ${periode.fin}`],
      [`Rapport généré le: ${new Date().toLocaleString('fr-CD')}`],
      [] // Empty row for spacing
    ], { origin: "A1" });
  };

  // 1. Feuille Résumé
  const resumeRows = resumeData.map(r => ({
    "N°ID": r.employe.numero_id,
    "Nom": r.employe.nom,
    "Prénom": r.employe.prenom,
    "Jours présents": r.jours_presents,
    "Retards": r.retards,
    "Heures totales": parseFloat(r.heures_totales).toFixed(2),
    "Moy. heures/jour": r.jours_presents > 0 ? (parseFloat(r.heures_totales) / r.jours_presents).toFixed(2) : "0.00"
  }));
  const wsResume = XLSX.utils.json_to_sheet([]);
  addHeaderInfo(wsResume);
  XLSX.utils.sheet_add_json(wsResume, resumeRows, { origin: "A5", skipHeader: false });
  XLSX.utils.book_append_sheet(wb, wsResume, "Résumé");

  // 2. Feuille Détail
  const detailRows = detailData.map(d => ({
    "Date": d.date,
    "Employé": `${d.prenom} ${d.nom}`,
    "N°ID": d.numero_id,
    "Département": d.departement,
    "Type": d.type === 'entree' ? 'Entrée' : 'Sortie',
    "Heure": new Date(d.timestamp).toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' })
  }));
  const wsDetail = XLSX.utils.json_to_sheet([]);
  addHeaderInfo(wsDetail);
  XLSX.utils.sheet_add_json(wsDetail, detailRows, { origin: "A5", skipHeader: false });
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détail");

  // 3. Feuille Alertes
  const alertesRows = alertesData.map(a => ({
    "Date": a.date,
    "Employé": `${a.employe?.prenom || a.prenom} ${a.employe?.nom || a.nom}`,
    "Type": a.type_alerte,
    "Description": a.detail
  }));
  const wsAlertes = XLSX.utils.json_to_sheet([]);
  addHeaderInfo(wsAlertes);
  XLSX.utils.sheet_add_json(wsAlertes, alertesRows, { origin: "A5", skipHeader: false });
  XLSX.utils.book_append_sheet(wb, wsAlertes, "Alertes");

  // Save File
  XLSX.writeFile(wb, `Presence_SAD_${periode.debut}_${periode.fin}.xlsx`);
};
