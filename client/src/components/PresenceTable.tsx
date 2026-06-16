import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface PresenceData {
  employe: {
    id: number;
    nom: string;
    prenom: string;
    departement: string;
  };
  statut: 'present' | 'absent' | 'sorti';
  presences: any[]; // List of scans today
}

export const PresenceTable: React.FC<{ data: PresenceData[] }> = ({ data }) => {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const filtered = data.filter(item => {
    const nameMatch = `${item.employe.prenom} ${item.employe.nom}`.toLowerCase().includes(search.toLowerCase());
    const deptMatch = filterDept ? item.employe.departement === filterDept : true;
    const statutMatch = filterStatut ? item.statut === filterStatut : true;
    return nameMatch && deptMatch && statutMatch;
  });

  const getInitials = (prenom: string, nom: string) => `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase();
  
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const departments = Array.from(new Set(data.map(d => d.employe.departement).filter(Boolean)));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-semibold text-lg text-[#1e40af]">Présences du jour</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e40af] outline-none"
            />
          </div>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-[#1e40af]"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">Tous les départements</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-[#1e40af]"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="present">Présent</option>
            <option value="absent">Absent</option>
            <option value="sorti">Sorti</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-medium">Employé</th>
              <th className="px-6 py-4 font-medium">Département</th>
              <th className="px-6 py-4 font-medium">Heure d'entrée</th>
              <th className="px-6 py-4 font-medium">Heure de sortie</th>
              <th className="px-6 py-4 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const entree = item.presences.find(p => p.type === 'entree');
              const sortie = [...item.presences].reverse().find(p => p.type === 'sortie');
              
              const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' });

              return (
                <tr key={item.employe.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm ${getAvatarColor(item.employe.nom)}`}>
                        {getInitials(item.employe.prenom, item.employe.nom)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.employe.prenom} {item.employe.nom}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.employe.departement || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {entree ? formatTime(entree.timestamp) : '--:--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {sortie ? formatTime(sortie.timestamp) : '--:--'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      item.statut === 'present' ? 'bg-green-100 text-green-700' :
                      item.statut === 'absent' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.statut === 'present' ? 'Présent' : item.statut === 'absent' ? 'Absent' : 'Parti'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Aucun résultat trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
