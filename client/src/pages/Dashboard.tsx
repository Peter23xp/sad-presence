import React, { useState, useEffect } from 'react';
import { Users2, Clock, UserX, Scan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { PresenceTable } from '../components/PresenceTable';
import { AlertesList } from '../components/AlertesList';
import { authFetch } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [todayData, setTodayData] = useState<any[]>([]);
  const [alertesData, setAlertesData] = useState<any | null>(null);
  const [yesterdayData, setYesterdayData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().split('T')[0];

      const [todayRes, alertesRes, yesterdayRes] = await Promise.all([
        authFetch('/api/presences/today'),
        authFetch('/api/presences/alertes'),
        authFetch(`/api/presences?date=${yDate}`)
      ]);
      const today = await todayRes.json();
      const alertes = await alertesRes.json();
      const yData = await yesterdayRes.json();
      setTodayData(Array.isArray(today) ? today : []);
      setAlertesData(alertes);
      setYesterdayData(Array.isArray(yData) ? yData : []);
    } catch (err) {
      console.error("Erreur de chargement des données", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Auto-refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  const totalEmployes = todayData.length;
  const presents = todayData.filter(d => d.statut === 'present' || d.statut === 'sorti').length;
  const absents = todayData.filter(d => d.statut === 'absent').length;
  const retardataires = alertesData?.retardataires?.length || 0;

  // Variations vs hier
  const yesterdayPresents = new Set(yesterdayData.filter(p => p.type === 'entree').map(p => p.employe_id)).size;
  const diffPresents = presents - yesterdayPresents;
  const trendPresents = diffPresents === 0 ? 'Identique à hier' : `${diffPresents > 0 ? '+' : ''}${diffPresents}`;

  const diffAbsents = absents - (totalEmployes - yesterdayPresents);
  const trendAbsents = diffAbsents === 0 ? 'Identique à hier' : `${diffAbsents > 0 ? '+' : ''}${diffAbsents}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div onClick={() => navigate('/employes')} className="cursor-pointer">
            <StatCard
              title="Total employés"
              value={totalEmployes}
              icon={<Users2 size={24} />}
            />
          </div>
          <div onClick={() => navigate('/employes')} className="cursor-pointer">
            <StatCard
              title="Présents aujourd'hui"
              value={presents}
              icon={<Scan size={24} />}
              colorClass="text-green-600"
              trend={trendPresents}
              trendUp={diffPresents >= 0}
            />
          </div>
          <div onClick={() => navigate('/rapports')} className="cursor-pointer">
            <StatCard
              title="Absents"
              value={absents}
              icon={<UserX size={24} />}
              colorClass="text-red-600"
              trend={trendAbsents}
              trendUp={diffAbsents <= 0}
            />
          </div>
          <div onClick={() => navigate('/rapports')} className="cursor-pointer">
            <StatCard
              title="Retardataires"
              value={retardataires}
              icon={<Clock size={24} />}
              colorClass="text-orange-600"
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PresenceTable data={todayData} />
          </div>
          <div className="lg:col-span-1">
            <AlertesList data={alertesData} />
          </div>
        </div>

      </div>
    </div>
  );
};
