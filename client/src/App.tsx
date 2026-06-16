import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Employes } from './pages/Employes';
import { Rapports } from './pages/Rapports';
import { Parametres } from './pages/Parametres';
import { Login } from './pages/Login';
import { Scanner } from './components/Scanner';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useApi';

const ToastContainer = () => {
  const toasts = useToast();
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-6 py-4 rounded-xl shadow-2xl text-white font-semibold min-w-[300px] transition-all transform animate-in slide-in-from-right-8 flex items-center ${
          t.type === 'success' ? 'bg-[#16a34a]' : t.type === 'error' ? 'bg-red-600' : 'bg-[#1e40af]'
        }`}>
          {t.type === 'success' && <span className="mr-3 text-xl">✅</span>}
          {t.type === 'error' && <span className="mr-3 text-xl">❌</span>}
          {t.type === 'info' && <span className="mr-3 text-xl">ℹ️</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, login, logout, username } = useAuth();

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Login onLogin={login} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route element={<Layout onLogout={logout} username={username ?? ''} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employes" element={<Employes />} />
          <Route path="/rapports" element={<Rapports />} />
          <Route path="/parametres" element={<Parametres onLogout={logout} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
