import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, XCircle, Download } from 'lucide-react';
import { parseEmployesExcel, EmployeImport, generateTemplate } from '../lib/excel-parser';
import { authFetch } from '../hooks/useAuth';

export const ImportExcel: React.FC = () => {
  const [employes, setEmployes] = useState<EmployeImport[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setMessage(null);
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setMessage({ type: 'error', text: 'Veuillez uploader un fichier Excel valide (.xlsx, .xls)' });
      return;
    }

    try {
      const data = await parseEmployesExcel(file);
      setEmployes(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erreur lors de la lecture du fichier Excel.' });
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    const valides = employes.filter(e => e._valid);
    if (valides.length === 0) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const res = await authFetch('/api/employes/import', {
        method: 'POST',
        body: JSON.stringify(valides.map(({ _valid, _errors, ...rest }) => rest)),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'import");

      setMessage({ type: 'success', text: data.message || 'Importation réussie' });
      setEmployes([]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const validesCount = employes.filter(e => e._valid).length;
  const ignoresCount = employes.length - validesCount;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#1e40af]">Importation Excel</h2>
        <button 
          onClick={generateTemplate}
          className="flex items-center text-sm text-[#16a34a] border border-[#16a34a] px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors"
        >
          <Download size={16} className="mr-2" />
          Télécharger le modèle Excel
        </button>
      </div>

      {employes.length === 0 ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging ? 'border-[#1e40af] bg-blue-50' : 'border-gray-300 hover:border-[#1e40af]'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Glissez et déposez votre fichier ici
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Prend en charge : .xlsx, .xls
          </p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) handleFile(e.target.files[0]);
              // Reset input so the same file can be uploaded again
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#1e40af] text-white px-6 py-2 rounded-md hover:bg-blue-900 transition-colors font-medium"
          >
            Parcourir
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-md">
            <div>
              <p className="font-medium text-[#1e40af]">
                Résumé de l'analyse
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="text-[#16a34a] font-semibold">{validesCount} employés valides</span> prêts à être importés, <span className="text-red-500 font-semibold">{ignoresCount} lignes ignorées</span>.
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setEmployes([])}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleImport}
                disabled={isImporting || validesCount === 0}
                className="bg-[#1e40af] text-white px-6 py-2 rounded-md hover:bg-blue-900 transition-colors font-medium disabled:opacity-50 flex items-center"
              >
                {isImporting ? 'Importation...' : `Importer ${validesCount} employés`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom & Prénom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poste</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Département</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employes.slice(0, 50).map((emp, idx) => (
                  <tr key={idx} className={emp._valid ? '' : 'bg-red-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp._valid ? (
                        <CheckCircle className="text-[#16a34a] w-5 h-5" />
                      ) : (
                        <div className="flex items-center text-red-500" title={emp._errors.join(', ')}>
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {emp.numero_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {emp.nom} {emp.prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {emp.poste}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {emp.departement}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span>{emp.email}</span>
                        <span className="text-xs text-gray-500">{emp.telephone}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employes.length > 50 && (
              <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                Affichage des 50 premières lignes sur {employes.length}
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};
