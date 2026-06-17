import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Power, Download, X, Barcode } from 'lucide-react';
import { ImportExcel } from '../components/ImportExcel';
import { BarcodeModal } from '../components/BarcodeModal';
import { authFetch } from '../hooks/useAuth';

export const Employes: React.FC = () => {
  const [employes, setEmployes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [barcodeEmp, setBarcodeEmp] = useState<any>(null);
  const [showInactifs, setShowInactifs] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<any>({ numero_id: '', nom: '', prenom: '', sexe: '', poste: '', departement: '', email: '', telephone: '', localisation: '' });

  const fetchEmployes = async () => {
    try {
      const url = showInactifs ? '/api/employes?statut=all' : '/api/employes';
      const res = await authFetch(url);
      const data = await res.json();
      setEmployes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmployes();
  }, [showInactifs]);

  const activeCount = employes.filter(e => e.statut === 'actif').length;
  const inactifCount = employes.filter(e => e.statut === 'inactif').length;
  const depts = Array.from(new Set(employes.map(e => e.departement).filter(Boolean)));

  const filtered = employes.filter(e => {
    const matchSearch = `${e.nom} ${e.prenom} ${e.numero_id} ${e.departement}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter ? e.departement === deptFilter : true;
    return matchSearch && matchDept;
  });

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = currentEmp.id ? 'PUT' : 'POST';
      const url = currentEmp.id ? `/api/employes/${currentEmp.id}` : '/api/employes/import';
      const body = currentEmp.id ? currentEmp : [currentEmp];

      await authFetch(url, { method, body: JSON.stringify(body) });
      setModalOpen(false);
      fetchEmployes();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatut = async (id: number, currentStatut: string) => {
    try {
      if (currentStatut === 'actif') {
        await authFetch(`/api/employes/${id}`, { method: 'DELETE' });
      } else {
        await authFetch(`/api/employes/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ statut: 'actif' })
        });
      }
      fetchEmployes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Modal Import Excel */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black">Importer depuis Excel</h2>
              <button onClick={() => { setImportOpen(false); fetchEmployes(); }} className="text-gray-400 hover:text-gray-900 transition"><X size={24}/></button>
            </div>
            <ImportExcel />
          </div>
        </div>
      )}

      {/* Modal Code-barres */}
      {barcodeEmp && (
        <BarcodeModal employe={barcodeEmp} onClose={() => setBarcodeEmp(null)} />
      )}

      {/* Modal Formulaire Employé */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{currentEmp.id ? 'Modifier' : 'Ajouter'} un employé</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° ID *</label>
                  <input required type="text" value={currentEmp.numero_id} onChange={e => setCurrentEmp({...currentEmp, numero_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input required type="text" value={currentEmp.nom} onChange={e => setCurrentEmp({...currentEmp, nom: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input required type="text" value={currentEmp.prenom} onChange={e => setCurrentEmp({...currentEmp, prenom: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
                  <input type="text" value={currentEmp.poste} onChange={e => setCurrentEmp({...currentEmp, poste: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                  <input type="text" value={currentEmp.departement} onChange={e => setCurrentEmp({...currentEmp, departement: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={currentEmp.email} onChange={e => setCurrentEmp({...currentEmp, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="text" value={currentEmp.telephone} onChange={e => setCurrentEmp({...currentEmp, telephone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select value={currentEmp.sexe || ''} onChange={e => setCurrentEmp({...currentEmp, sexe: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition">
                    <option value="">— Sélectionner —</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                  <input type="text" value={currentEmp.localisation || ''} onChange={e => setCurrentEmp({...currentEmp, localisation: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1e40af] focus:border-transparent outline-none transition"
                    placeholder="ex: Bureau pays, Terrain..." />
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition">Annuler</button>
                <button type="submit" className="px-5 py-2.5 font-medium bg-[#07bb20] text-white rounded-lg hover:bg-[#069e1b] transition shadow-md">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Employés</h1>
          <p className="text-gray-500 font-medium mt-1">{activeCount} actifs · {inactifCount} inactifs</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowInactifs(!showInactifs)}
            className={`flex items-center px-4 py-2 rounded-lg transition font-medium border ${showInactifs ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {showInactifs ? '👁 Masquer inactifs' : '👁 Voir inactifs'}
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center px-4 py-2 border-2 border-green-600 text-green-700 bg-white rounded-lg hover:bg-green-50 transition font-semibold shadow-sm">
            <Download className="w-4 h-4 mr-2" /> Importer Excel
          </button>
          <button onClick={() => { setCurrentEmp({ numero_id: '', nom: '', prenom: '', sexe: '', poste: '', departement: '', email: '', telephone: '', localisation: '' }); setModalOpen(true); }} className="flex items-center px-4 py-2 bg-[#07bb20] text-white rounded-lg hover:bg-[#069e1b] transition font-semibold shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un employé
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text" placeholder="Rechercher par nom, ID ou département..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition"
            />
          </div>
          <select
            value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-56 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition cursor-pointer"
          >
            <option value="">Tous les départements</option>
            {depts.map(d => <option key={d as string} value={d as string}>{d}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-semibold">N° ID</th>
                <th className="px-6 py-4 font-semibold">Nom Complet</th>
                <th className="px-6 py-4 font-semibold">Poste</th>
                <th className="px-6 py-4 font-semibold">Département</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {paginated.map(e => (
                <tr key={e.id} className="hover:bg-green-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-500 bg-gray-50/50 w-24 text-center">{e.numero_id}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{e.prenom} {e.nom}</td>
                  <td className="px-6 py-4 text-gray-600">{e.poste || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {e.departement ? (
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium text-gray-600">{e.departement}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center w-max ${e.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${e.statut === 'actif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {e.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setBarcodeEmp(e)} className="p-2 bg-gray-50 text-gray-600 rounded-md hover:bg-purple-100 hover:text-purple-600 transition" title="Code-barres">
                        <Barcode className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setCurrentEmp(e); setModalOpen(true); }} className="p-2 bg-gray-50 text-gray-600 rounded-md hover:bg-green-100 hover:text-black transition" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatut(e.id, e.statut)} className={`p-2 bg-gray-50 rounded-md transition ${e.statut === 'actif' ? 'text-gray-600 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-green-100 hover:text-green-600'}`} title={e.statut === 'actif' ? 'Désactiver' : 'Activer'}>
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="inline-flex flex-col items-center justify-center text-gray-400">
                      <Search className="w-8 h-8 mb-4 opacity-20" />
                      <p className="text-base font-medium text-gray-500">Aucun employé ne correspond à votre recherche.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition shadow-sm ${page === i + 1 ? 'bg-[#07bb20] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
