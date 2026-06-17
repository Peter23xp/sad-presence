import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileBarChart, Settings, Scan, Menu, X, LogOut } from 'lucide-react';

interface LayoutProps {
  onLogout: () => void;
  username: string;
}

export const Layout: React.FC<LayoutProps> = ({ onLogout, username }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const getPageTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return "Tableau de bord";
      case '/employes': return "Gestion des Employés";
      case '/rapports': return "Génération de Rapports";
      case '/parametres': return "Paramètres Généraux";
      default: return "SAD-Presence";
    }
  };

  const NavItem = ({ to, icon, label }: any) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => 
        `flex items-center px-4 py-3 rounded-xl transition-colors font-medium ${isActive ? 'bg-[#07bb20] text-white shadow-md' : 'text-gray-500 hover:bg-green-50 hover:text-black'}`
      }
      onClick={() => setSidebarOpen(false)}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:block flex flex-col shadow-sm print:hidden`}>
        <div className="px-6 py-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm p-1">
              <img src="/logo.png" alt="SAD Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black text-black tracking-tight leading-none uppercase">SAD</h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-0.5">International</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Tableau de bord" />
          <NavItem to="/scanner" icon={<Scan size={20} />} label="Scanner" />
          <NavItem to="/employes" icon={<Users size={20} />} label="Employés" />
          <NavItem to="/rapports" icon={<FileBarChart size={20} />} label="Rapports" />
          <NavItem to="/parametres" icon={<Settings size={20} />} label="Paramètres" />
        </nav>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 mt-auto space-y-2">
          <div className="text-center py-2 bg-white rounded-lg border border-gray-100 shadow-sm">
            <p className="text-base font-bold text-black tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString('fr-CD')}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-1">Africa / Kinshasa</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Header contextuel */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 shadow-sm shrink-0 print:hidden">
          <div className="flex items-center">
            <button className="lg:hidden mr-4 text-gray-500 hover:text-black transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{getPageTitle()}</h2>
          </div>
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500 capitalize hidden sm:block font-medium">
              {currentTime.toLocaleDateString('fr-CD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button
              onClick={() => navigate('/parametres')}
              className="w-9 h-9 bg-[#07bb20] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm hover:bg-[#069e1b] transition-colors uppercase"
              title={username}
            >
              {username ? username.charAt(0).toUpperCase() : '?'}
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
          <Outlet />
        </div>
      </main>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
