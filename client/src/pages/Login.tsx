import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Download, KeyRound, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'setup' | 'recover';

interface LoginProps {
  onLogin: (token: string, username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [keyDownloaded, setKeyDownloaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        if (!data.initialized) {
          setIsFirstTime(true);
          setMode('setup');
        }
      });
  }, []);

  const downloadRecoveryKey = (key: string) => {
    const content = [
      'SAD-International — Clé de récupération',
      '========================================',
      '',
      `Clé : ${key}`,
      '',
      'IMPORTANT :',
      '- Cette clé ne peut être utilisée qu\'une seule fois.',
      '- Conservez-la en lieu sûr.',
      '- Après utilisation, générez-en une nouvelle dans Paramètres.',
      '',
      `Générée le : ${new Date().toLocaleString('fr-CD')}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SAD_cle_recuperation.txt';
    link.click();
    setKeyDownloaded(true);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setRecoveryKey(data.recoveryKey);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.setup_required) { setIsFirstTime(true); setMode('setup'); return; }
        setError(data.error);
        return;
      }
      onLogin(data.token, data.username);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recovery_key: recoveryInput.trim().toUpperCase(), new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onLogin(data.token, data.username);
    } finally {
      setLoading(false);
    }
  };

  // Ecran affiché après setup : affiche la clé à télécharger
  if (recoveryKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-gray-100 rounded-2xl mb-4 shadow-sm p-2">
              <img src="/logo.png" alt="SAD Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Compte créé !</h2>
            <p className="text-gray-500 mt-2 text-sm">Téléchargez votre clé de récupération avant de continuer</p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Clé de récupération — Usage unique</p>
            <div className="bg-white rounded-xl px-4 py-3 border border-amber-200 text-center">
              <span className="font-mono text-2xl font-bold text-gray-900 tracking-[0.2em]">{recoveryKey}</span>
            </div>
            <p className="text-xs text-amber-700 mt-3 leading-relaxed">
              Cette clé vous permettra de réinitialiser votre mot de passe si vous l'oubliez. Elle ne peut être utilisée <strong>qu'une seule fois</strong>.
            </p>
          </div>

          <button
            onClick={() => downloadRecoveryKey(recoveryKey)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold mb-4 transition ${
              keyDownloaded ? 'bg-green-600 text-white' : 'bg-[#07bb20] text-white hover:bg-[#069e1b]'
            }`}
          >
            <Download size={18} />
            {keyDownloaded ? 'Téléchargée ✓' : 'Télécharger la clé'}
          </button>

          <button
            disabled={!keyDownloaded}
            onClick={() => {
              fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
              }).then(r => r.json()).then(d => onLogin(d.token, d.username));
            }}
            className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40"
          >
            Accéder à l'application →
          </button>
          {!keyDownloaded && (
            <p className="text-center text-xs text-gray-400 mt-2">Téléchargez d'abord la clé pour continuer</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#07bb20] px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-lg overflow-hidden p-2">
            <img src="/logo.png" alt="SAD Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SAD-International</h1>
          <p className="text-black text-sm mt-1 font-medium">Système de Gestion de Présence</p>
        </div>

        <div className="p-8">

          {/* LOGIN */}
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {isFirstTime ? 'Première connexion' : 'Connexion'}
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
                  <input
                    type="text" value={username} onChange={e => setUsername(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-[#07bb20] text-white py-3 rounded-xl font-semibold hover:bg-[#069e1b] transition disabled:opacity-50">
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
              <button onClick={() => setMode('recover')} className="mt-4 text-sm text-gray-400 hover:text-black transition w-full text-center">
                Mot de passe oublié ? Utiliser la clé de récupération
              </button>
            </>
          )}

          {/* SETUP */}
          {mode === 'setup' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Créer votre compte</h2>
              <p className="text-sm text-gray-500 mb-6">Première utilisation — configurez vos identifiants</p>
              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
                  <input
                    type="text" value={username} onChange={e => setUsername(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                      placeholder="Minimum 6 caractères"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                    placeholder="••••••••"
                  />
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-[#07bb20] text-white py-3 rounded-xl font-semibold hover:bg-[#069e1b] transition disabled:opacity-50">
                  {loading ? 'Création...' : 'Créer le compte'}
                </button>
              </form>
            </>
          )}

          {/* RECOVER */}
          {mode === 'recover' && (
            <>
              <button onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-6 transition">
                <ArrowLeft size={16} /> Retour
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <KeyRound size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Récupération</h2>
                  <p className="text-xs text-gray-500">Utilisez votre clé de récupération à 14 caractères</p>
                </div>
              </div>
              <form onSubmit={handleRecover} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clé de récupération</label>
                  <input
                    type="text" value={recoveryInput} onChange={e => setRecoveryInput(e.target.value.toUpperCase())} required
                    maxLength={14}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400 transition text-sm font-mono tracking-[0.15em] uppercase"
                    placeholder="XXXXXXXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-amber-400 transition text-sm"
                      placeholder="Minimum 6 caractères"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold hover:bg-amber-600 transition disabled:opacity-50">
                  {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
