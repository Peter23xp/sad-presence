import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface AlertesData {
  absents: any[];
  retardataires: any[];
}

export const AlertesList: React.FC<{ data: AlertesData | null | any }> = ({ data }) => {
  if (!data || !data.absents || !data.retardataires) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold text-lg text-red-600 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          Alertes du jour
        </h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {data.absents.length === 0 && data.retardataires.length === 0 ? (
          <div className="text-center text-gray-500 py-8 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <p className="font-medium text-gray-700">Aucune alerte à signaler aujourd'hui !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.retardataires.map((r: any, i: number) => {
              const arrivee = new Date(r.heure_arrivee).toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={`retard-${i}`} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100 transition-all hover:bg-orange-100/50">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.employe.prenom} {r.employe.nom}</p>
                    <p className="text-xs text-orange-800 mt-1">
                      Arrivé(e) en retard à <strong className="font-bold">{arrivee}</strong>
                    </p>
                  </div>
                </div>
              );
            })}
            
            {data.absents.map((a: any, i: number) => (
              <div key={`absent-${i}`} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100 transition-all hover:bg-red-100/50">
                <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{a.prenom} {a.nom}</p>
                  <p className="text-xs text-red-800 mt-1">
                    Absence non justifiée
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
