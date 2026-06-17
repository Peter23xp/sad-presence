import React, { useState, useEffect, useMemo } from 'react';
import { Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportRapportExcel } from '../lib/export-excel';
import { authFetch } from '../hooks/useAuth';

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export const Rapports: React.FC = () => {
  const [debut, setDebut] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fin, setFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const fetchRapport = async () => {
    setLoading(true);
    try {
      const [rapportRes, presencesRes] = await Promise.all([
        authFetch(`/api/presences/rapport?debut=${debut}&fin=${fin}`),
        authFetch(`/api/presences?debut=${debut}&fin=${fin}`)
      ]);
      const rapportData = await rapportRes.json();
      const presencesData = await presencesRes.json();
      setData(Array.isArray(rapportData) ? rapportData : []);
      setDetails(Array.isArray(presencesData) ? presencesData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRapport();
  }, [debut, fin]);

  const setPeriode = (preset: string) => {
    const today = new Date();
    switch (preset) {
      case 'today':
        setDebut(format(today, 'yyyy-MM-dd'));
        setFin(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setDebut(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setFin(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'month':
        setDebut(format(startOfMonth(today), 'yyyy-MM-dd'));
        setFin(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastM = subMonths(today, 1);
        setDebut(format(startOfMonth(lastM), 'yyyy-MM-dd'));
        setFin(format(endOfMonth(lastM), 'yyyy-MM-dd'));
        break;
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalJoursPeriode = useMemo(() => {
    if (!debut || !fin) return 0;
    return Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [debut, fin]);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'nom') {
          aVal = a.employe.nom;
          bVal = b.employe.nom;
        } else if (sortConfig.key === 'heures_totales') {
          aVal = parseFloat(a.heures_totales);
          bVal = parseFloat(b.heures_totales);
        } else if (sortConfig.key === 'jours_absents') {
          aVal = a.jours_absents ?? Math.max(0, totalJoursPeriode - a.jours_presents);
          bVal = b.jours_absents ?? Math.max(0, totalJoursPeriode - b.jours_presents);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, totalJoursPeriode]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ChevronDown className="w-4 h-4 opacity-20 inline ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 inline ml-1 text-black" /> : <ChevronDown className="w-4 h-4 inline ml-1 text-black" />;
  };

  const totals = data.reduce((acc, curr) => {
    acc.jours_presents += curr.jours_presents;
    acc.retards += curr.retards;
    acc.heures_totales += parseFloat(curr.heures_totales);
    return acc;
  }, { jours_presents: 0, retards: 0, heures_totales: 0 });

  const presencesParJour = useMemo(() => {
    const parDate: Record<string, Set<number>> = {};
    details.forEach(d => {
      if (d.type === 'entree') {
        if (!parDate[d.date]) parDate[d.date] = new Set();
        parDate[d.date].add(d.employe_id);
      }
    });
    const dates = Object.keys(parDate).sort();
    const last7 = dates.slice(-7);
    return last7.map(date => ({
      date,
      label: new Date(date).toLocaleDateString('fr-CD', { weekday: 'short', day: 'numeric' }),
      count: parDate[date].size
    }));
  }, [details]);



  const handleExport = () => {
    // Generate derived alerts from details
    const alertes = details
      .filter(d => d.type === 'entree')
      .map(d => {
        const time = new Date(d.timestamp).getHours() * 60 + new Date(d.timestamp).getMinutes();
        const limit = 8 * 60 + 15; // 08:15 default
        if (time > limit) {
          return { date: d.date, employe: { nom: d.nom, prenom: d.prenom }, type_alerte: 'Retard', detail: `Arrivée à ${new Date(d.timestamp).toLocaleTimeString('fr-CD')}` };
        }
        return null;
      }).filter(Boolean);

    exportRapportExcel(data, details, alertes, { debut, fin });
  };

  const handlePrint = () => {
    window.print();
  };

  // Stats réelles pour le camembert
  const totalPres = totals.jours_presents;
  const totalRet = totals.retards;
  const totalAbs = data.reduce((acc, row) => acc + (row.jours_absents ?? Math.max(0, totalJoursPeriode - row.jours_presents)), 0);
  
  const totalPie = totalPres + totalAbs + totalRet || 1;
  const pctPres = (totalPres / totalPie) * 100;
  const pctRet = (totalRet / totalPie) * 100;
  const pctAbs = (totalAbs / totalPie) * 100;

  // Pie chart calculation
  const dashPres = `${pctPres} 100`;
  const dashRet = `${pctRet} 100`;
  const dashAbs = `${pctAbs} 100`;

  return (
    <div className="bg-gray-50 min-h-screen print:bg-white pb-12">
      {/* Header & Controls */}
      <div className="p-6 bg-white border-b border-gray-200 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-black">Génération de Rapports</h1>
          
          <div className="flex gap-3">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </button>
            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-[#07bb20] text-white rounded-lg text-sm font-medium hover:bg-[#069e1b] transition-colors">
              <Download className="w-4 h-4 mr-2" /> Exporter Excel
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 flex flex-wrap items-end gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setPeriode('today')} className="px-4 py-2 text-sm rounded-md hover:bg-white hover:shadow-sm font-medium text-gray-700 transition-all">Aujourd'hui</button>
            <button onClick={() => setPeriode('week')} className="px-4 py-2 text-sm rounded-md hover:bg-white hover:shadow-sm font-medium text-gray-700 transition-all">Cette semaine</button>
            <button onClick={() => setPeriode('month')} className="px-4 py-2 text-sm rounded-md hover:bg-white hover:shadow-sm font-medium text-gray-700 transition-all">Ce mois</button>
            <button onClick={() => setPeriode('lastMonth')} className="px-4 py-2 text-sm rounded-md hover:bg-white hover:shadow-sm font-medium text-gray-700 transition-all">Mois précédent</button>
          </div>

          <div className="flex items-center gap-3 ml-auto bg-white border border-gray-200 p-2 rounded-lg">
            <div>
              <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1 px-1">Du</span>
              <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="rounded text-sm border-none focus:ring-0 outline-none cursor-pointer" />
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div>
              <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1 px-1">Au</span>
              <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="rounded text-sm border-none focus:ring-0 outline-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0">
        
        {/* Print Header */}
        <div className="hidden print:flex mb-8 border-b-2 border-[#07bb20] pb-4 items-center gap-6">
          <div className="w-24 h-24 bg-white rounded-xl p-2 flex items-center justify-center shrink-0 border border-gray-200">
            <img src="/logo.png" alt="SAD Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight uppercase">SAD-International</h1>
            <h2 className="text-xl font-bold mt-2 text-gray-800">Rapport de présences détaillé</h2>
            <p className="text-gray-600 font-medium mt-1">Période du {format(new Date(debut), 'dd/MM/yyyy')} au {format(new Date(fin), 'dd/MM/yyyy')}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
          {/* Bar Chart (CSS) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center">
              <div className="w-2 h-6 bg-[#07bb20] rounded mr-3"></div>
              Tendance d'activité
            </h3>
            <div className="h-48 flex items-end justify-between gap-3 mt-auto">
              {(() => {
                const maxCount = Math.max(...presencesParJour.map(d => d.count), 1);
                return presencesParJour.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    Aucune donnée pour la période sélectionnée
                  </div>
                ) : (
                  presencesParJour.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-xs font-bold text-black opacity-0 group-hover:opacity-100 transition">{d.count}</span>
                      <div className="w-full bg-green-50 rounded-t-md relative flex-1">
                        <div
                          className="absolute bottom-0 w-full bg-[#07bb20] rounded-t-md transition-all duration-700 ease-out group-hover:bg-blue-700"
                          style={{ height: `${(d.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-400">{d.label}</span>
                    </div>
                  ))
                );
              })()}
            </div>
          </div>

          {/* Pie Chart (SVG) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 w-full">
              <h3 className="font-semibold text-gray-800 mb-6 flex items-center">
                <div className="w-2 h-6 bg-[#16a34a] rounded mr-3"></div>
                Répartition globale
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center justify-between text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center font-medium text-green-900">
                    <span className="w-3 h-3 rounded-full bg-[#16a34a] mr-3 shadow-sm"></span> Présences
                  </div>
                  <span className="font-bold text-green-700">{totalPres}</span>
                </li>
                <li className="flex items-center justify-between text-sm bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div className="flex items-center font-medium text-orange-900">
                    <span className="w-3 h-3 rounded-full bg-orange-500 mr-3 shadow-sm"></span> Retards
                  </div>
                  <span className="font-bold text-orange-700">{totalRet}</span>
                </li>
                <li className="flex items-center justify-between text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  <div className="flex items-center font-medium text-red-900">
                    <span className="w-3 h-3 rounded-full bg-red-500 mr-3 shadow-sm"></span> Absences
                  </div>
                  <span className="font-bold text-red-700">{totalAbs}</span>
                </li>
              </ul>
            </div>
            <div className="w-40 h-40 relative shrink-0 drop-shadow-md">
              <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90 rounded-full">
                <circle r="16" cx="16" cy="16" fill="#f3f4f6" />
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#16a34a" strokeWidth="32" strokeDasharray={`${dashPres} 100`} />
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#f97316" strokeWidth="32" strokeDasharray={`${dashRet} 100`} strokeDashoffset={`-${dashPres}`} />
                <circle r="16" cx="16" cy="16" fill="transparent" stroke="#ef4444" strokeWidth="32" strokeDasharray={`${dashAbs} 100`} strokeDashoffset={`-${pctPres + pctRet}`} />
              </svg>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#07bb20] text-white text-xs uppercase tracking-wider print:bg-gray-100 print:text-gray-800">
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-[#069e1b] transition-colors print:hover:bg-gray-100" onClick={() => handleSort('nom')}>
                    Employé <SortIcon column="nom" />
                  </th>
                  <th className="px-6 py-4 font-semibold">Département</th>
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-[#069e1b] transition-colors print:hover:bg-gray-100" onClick={() => handleSort('jours_presents')}>
                    Jours présents <SortIcon column="jours_presents" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-[#069e1b] transition-colors" onClick={() => handleSort('jours_absents')}>
                    Jours absents <SortIcon column="jours_absents" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-[#069e1b] transition-colors print:hover:bg-gray-100" onClick={() => handleSort('retards')}>
                    Retards <SortIcon column="retards" />
                  </th>
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-[#069e1b] transition-colors print:hover:bg-gray-100" onClick={() => handleSort('heures_totales')}>
                    Heures totales <SortIcon column="heures_totales" />
                  </th>
                  <th className="px-6 py-4 font-semibold">Moy. H/Jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">Chargement des données...</td>
                  </tr>
                ) : sortedData.map((row, index) => (
                  <tr key={row.employe.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition-colors`}>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.employe.prenom} {row.employe.nom}</td>
                    <td className="px-6 py-4 text-gray-600">{row.employe.departement || '-'}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{row.jours_presents}</td>
                    <td className="px-6 py-4 text-red-500 font-medium">{row.jours_absents ?? Math.max(0, totalJoursPeriode - row.jours_presents)}</td>
                    <td className="px-6 py-4 text-orange-600 font-bold">{row.retards}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{parseFloat(row.heures_totales).toFixed(2)}h</td>
                    <td className="px-6 py-4 text-gray-600">
                      {row.jours_presents > 0 ? (parseFloat(row.heures_totales) / row.jours_presents).toFixed(2) : '0.00'}h
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-5 text-gray-900" colSpan={2}>TOTAUX GLOBAUX</td>
                  <td className="px-6 py-5 text-[#16a34a] text-base">{totals.jours_presents}</td>
                  <td className="px-6 py-5 text-red-500 text-base">{data.reduce((acc, row) => acc + (row.jours_absents ?? Math.max(0, totalJoursPeriode - row.jours_presents)), 0)}</td>
                  <td className="px-6 py-5 text-orange-600 text-base">{totals.retards}</td>
                  <td className="px-6 py-5 text-black text-base">{totals.heures_totales.toFixed(2)}h</td>
                  <td className="px-6 py-5">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      {/* Styles d'impression */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
        }
      `}</style>
    </div>
  );
};
