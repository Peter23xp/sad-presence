import React, { useState, useEffect } from 'react';
import { Save, Database, RefreshCw, Download, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { getToken, authFetch } from '../hooks/useAuth';

interface ParametresProps {
  onLogout: () => void;
}

export const Parametres: React.FC<ParametresProps> = ({ onLogout: _onLogout }) => {
  const [params, setParams] = useState({
    heure_entree: '08:00',
    heure_sortie: '17:00',
    tolerance_minutes: '15',
    nom_entreprise: 'SAD-International',
    ville: 'Kinshasa'
  });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Changement de mot de passe
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clé de récupération
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false);

  // Changement de nom d'utilisateur
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    authFetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        if (data.username) setCurrentUsername(data.username);
      });
  }, []);

  useEffect(() => {
    authFetch('/api/parametres')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setParams(prev => ({ ...prev, ...data }));
        }
        setInitialLoad(false);
      });
  }, []);

  const saveParams = async (newParams: any) => {
    if (initialLoad) return;
    setSaving(true);
    try {
      await authFetch('/api/parametres', {
        method: 'PUT',
        body: JSON.stringify(newParams)
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (initialLoad) return;
    const timer = setTimeout(() => {
      saveParams(params);
    }, 1000);
    return () => clearTimeout(timer);
  }, [params, initialLoad]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBackup = () => {
    window.location.href = '/api/db/backup';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== newPwdConfirm) { setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' }); return; }
    if (newPwd.length < 6) { setPwdMsg({ type: 'error', text: 'Minimum 6 caractères' }); return; }
    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdMsg({ type: 'error', text: data.error }); return; }
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès' });
      setCurrentPwd(''); setNewPwd(''); setNewPwdConfirm('');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameMsg(null);
    if (!newUsername.trim()) { setUsernameMsg({ type: 'error', text: 'Nouveau nom requis' }); return; }
    setUsernameLoading(true);
    try {
      const res = await authFetch('/api/auth/change-username', {
        method: 'POST',
        body: JSON.stringify({ new_username: newUsername.trim(), password: usernamePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setUsernameMsg({ type: 'error', text: data.error }); return; }
      setUsernameMsg({ type: 'success', text: 'Nom d\'utilisateur modifié avec succès' });
      setCurrentUsername(newUsername.trim());
      setNewUsername('');
      setUsernamePassword('');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleGenerateRecovery = async () => {
    if (!confirm('Générer une nouvelle clé invalidera l\'ancienne. Continuer ?')) return;
    setRecoveryLoading(true);
    setNewRecoveryKey(null);
    setRecoveryDownloaded(false);
    try {
      const res = await fetch('/api/auth/generate-recovery', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) setNewRecoveryKey(data.recoveryKey);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const downloadRecoveryKey = (key: string) => {
    const content = [
      'SAD-International — Clé de récupération',
      '========================================',
      '',
      `Clé : ${key}`,
      '',
      'IMPORTANT : Cette clé ne peut être utilisée qu\'une seule fois.',
      `Générée le : ${new Date().toLocaleString('fr-CD')}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SAD_cle_recuperation.txt';
    link.click();
    setRecoveryDownloaded(true);
  };

  const handleReset = async () => {
    if (confirm("ATTENTION : Cela va supprimer toutes les présences et tous les employés (sauf 3 de test). Êtes-vous sûr ?")) {
      try {
        await authFetch('/api/db/reset', { method: 'POST' });
        alert("Base de données réinitialisée.");
      } catch (err) {
        alert("Erreur lors de la réinitialisation.");
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1e40af]">Paramètres</h1>
          <p className="text-gray-500">Configuration générale du système</p>
        </div>
        <div className="h-8 flex items-center">
          {saving && <span className="text-gray-400 text-sm flex items-center"><RefreshCw className="w-4 h-4 mr-2 animate-spin"/> Sauvegarde...</span>}
          {!saving && savedOk && <span className="text-green-600 text-sm font-medium flex items-center"><Save className="w-4 h-4 mr-2"/> Enregistré ✓</span>}
        </div>
      </div>

      <div className="space-y-8">
        {/* Horaires */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">Horaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure d'entrée</label>
              <input type="time" name="heure_entree" value={params.heure_entree} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure de sortie</label>
              <input type="time" name="heure_sortie" value={params.heure_sortie} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tolérance retard (min)</label>
              <input type="number" name="tolerance_minutes" value={params.tolerance_minutes} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Entreprise */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">Entreprise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
              <input type="text" name="nom_entreprise" value={params.nom_entreprise} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" name="ville" value={params.ville} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition" />
            </div>
          </div>
        </div>

        {/* Sécurité — Changement de mot de passe */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-500" /> Sécurité
          </h2>

          {/* Changement de nom d'utilisateur */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-3">
              Nom d'utilisateur actuel : <strong className="text-gray-800 font-mono">{currentUsername}</strong>
            </p>
            <form onSubmit={handleChangeUsername} className="space-y-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau nom d'utilisateur</label>
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                  placeholder="Nouveau nom..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer avec votre mot de passe</label>
                <input type="password" value={usernamePassword} onChange={e => setUsernamePassword(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm"
                  placeholder="••••••••" />
              </div>
              {usernameMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg ${usernameMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {usernameMsg.text}
                </p>
              )}
              <button type="submit" disabled={usernameLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50 text-sm">
                {usernameLoading ? 'Modification...' : 'Changer le nom d\'utilisateur'}
              </button>
            </form>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={6}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm" placeholder="Minimum 6 caractères" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
              <input type="password" value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#1e40af] transition text-sm" />
            </div>
            {pwdMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {pwdMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwdLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e40af] text-white rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50 text-sm">
              <Lock size={15} /> {pwdLoading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>

          {/* Clé de récupération */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <KeyRound size={15} className="text-amber-500" /> Clé de récupération
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Génère une nouvelle clé à 14 caractères. L'ancienne clé sera invalidée. Usage unique.
            </p>

            {newRecoveryKey ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Nouvelle clé générée</p>
                <div className="bg-white rounded-lg px-4 py-3 border border-amber-200 text-center">
                  <span className="font-mono text-xl font-bold text-gray-900 tracking-[0.2em]">{newRecoveryKey}</span>
                </div>
                <button onClick={() => downloadRecoveryKey(newRecoveryKey)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition ${recoveryDownloaded ? 'bg-green-600 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                  <Download size={15} /> {recoveryDownloaded ? 'Téléchargée ✓' : 'Télécharger la clé'}
                </button>
              </div>
            ) : (
              <button onClick={handleGenerateRecovery} disabled={recoveryLoading}
                className="flex items-center gap-2 px-5 py-2.5 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg font-medium hover:bg-amber-100 transition text-sm disabled:opacity-50">
                <KeyRound size={15} /> {recoveryLoading ? 'Génération...' : 'Générer une nouvelle clé'}
              </button>
            )}
          </div>
        </div>

        {/* Base de données */}
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3 flex items-center"><Database className="w-5 h-5 mr-2 text-gray-600" /> Base de données</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleBackup} className="flex items-center px-4 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition shadow-sm">
              <Download className="w-4 h-4 mr-2" /> Sauvegarder la base de données
            </button>
            <button onClick={handleReset} className="flex items-center px-4 py-2.5 border border-red-200 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100 transition">
              <RefreshCw className="w-4 h-4 mr-2" /> Réinitialiser les données de test
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed max-w-2xl">La sauvegarde télécharge le fichier SQLite contenant toutes les présences et tous les employés. La réinitialisation est une action <strong className="text-red-500">destructive</strong>.</p>
        </div>
      </div>
    </div>
  );
};
