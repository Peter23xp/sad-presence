import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, Keyboard, Smartphone, Monitor, Wifi, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../hooks/useAuth';
import QRCode from 'react-qr-code';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface ScanResult {
  success: boolean;
  message: string;
  type?: string;
}

const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scannerUrl, setScannerUrl] = useState('');
  const [isMobile] = useState(isMobileDevice);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/network-info')
      .then(r => r.json())
      .then(data => {
        setScannerUrl(`https://${data.ip}:${window.location.port}/scanner`);
      })
      .catch(() => {
        setScannerUrl(`https://${window.location.hostname}:${window.location.port}/scanner`);
      });
  }, []);

  const handleScan = async (code: string) => {
    try {
      const res = await authFetch('/api/presences/scan', {
        method: 'POST',
        body: JSON.stringify({ numero_id: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanResult({
          success: false,
          message: `Employé non trouvé`,
          type: code,
        });
      } else {
        const timeStr = new Date(data.timestamp).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        setScanResult({
          success: true,
          message: `${data.employe.prenom} ${data.employe.nom}`,
          type: `${data.type === 'entree' ? 'Entrée' : 'Sortie'} — ${timeStr}`,
        });
      }
    } catch {
      setScanResult({
        success: false,
        message: `Erreur de connexion`,
        type: code,
      });
    }
  };

  const { videoRef, isScanning, startScan, stopScan, error } = useBarcodeScanner({
    onScan: handleScan,
  });

  useEffect(() => {
    if (isMobile && !isScanning) {
      startScan();
    }
  }, [isMobile]);

  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => setScanResult(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  // --- MOBILE VIEW: Camera scanner ---
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col relative">
        {/* Camera fullscreen */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover absolute inset-0"
          />

          {/* Overlay frame */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-64 h-64 relative">
              {/* Corner marks */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
              {/* Scan line */}
              <div className="w-full h-0.5 bg-[#16a34a] absolute left-0 animate-[scanline_2s_ease-in-out_infinite] shadow-[0_0_8px_#16a34a]"></div>
            </div>
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-white font-bold text-lg">SAD-Presence</h1>
                <p className="text-white/60 text-xs">Pointez le badge devant la caméra</p>
              </div>
              <button
                onClick={isScanning ? stopScan : startScan}
                className={`p-3 rounded-full ${isScanning ? 'bg-white/20' : 'bg-[#1e40af]'}`}
              >
                {isScanning ? <CameraOff size={20} className="text-white" /> : <Camera size={20} className="text-white" />}
              </button>
            </div>
          </div>

          {/* Bottom manual input */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Saisie manuelle du N° ID"
                className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/50"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-[#1e40af] text-white px-5 py-3 rounded-xl font-medium disabled:opacity-40"
              >
                OK
              </button>
            </form>
          </div>
        </div>

        {/* Result notification */}
        <div className={`fixed top-20 left-4 right-4 z-50 transition-all duration-500 ${scanResult ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          {scanResult && (
            <div className={`rounded-2xl p-5 shadow-2xl backdrop-blur-md ${
              scanResult.success ? 'bg-[#16a34a]/95' : 'bg-red-500/95'
            }`}>
              <p className="text-white font-bold text-xl">{scanResult.message}</p>
              <p className="text-white/80 text-sm mt-1">{scanResult.type}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-30 p-8">
            <div className="text-center">
              <Camera size={48} className="text-white/30 mx-auto mb-4" />
              <p className="text-white/60 text-sm">{error}</p>
              <button onClick={startScan} className="mt-4 bg-[#1e40af] text-white px-6 py-3 rounded-xl font-medium">
                Réessayer
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes scanline {
            0% { top: 0; }
            50% { top: calc(100% - 2px); }
            100% { top: 0; }
          }
        `}</style>
      </div>
    );
  }

  // --- DESKTOP VIEW: QR Code display ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6 relative">
      {/* Bouton retour */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#1e40af] hover:border-[#1e40af] transition-colors shadow-sm font-medium text-sm"
      >
        <ArrowLeft size={18} />
        Tableau de bord
      </button>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e40af] rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Smartphone size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Pointage</h1>
          <p className="text-gray-500 mt-2">Scannez le QR code avec votre téléphone</p>
        </div>

        {/* QR Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-[#16a34a] rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500 font-medium">Système actif</span>
            <span className="text-sm text-gray-400">—</span>
            <span className="text-sm font-semibold text-gray-700">
              {currentTime.toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200">
              {scannerUrl ? (
                <QRCode value={scannerUrl} size={220} level="M" />
              ) : (
                <div className="w-[220px] h-[220px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                  <Wifi size={32} className="text-gray-300" />
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#1e40af] font-bold text-xs">1</span>
              </div>
              <p className="text-gray-600">Ouvrez l'appareil photo de votre téléphone</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#1e40af] font-bold text-xs">2</span>
              </div>
              <p className="text-gray-600">Scannez ce QR code — la caméra scanner s'ouvre automatiquement</p>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#1e40af] font-bold text-xs">3</span>
              </div>
              <p className="text-gray-600">Présentez le badge employé devant la caméra du téléphone</p>
            </div>
          </div>

          {/* Network info */}
          {scannerUrl && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Monitor size={14} />
                <span className="font-mono">{scannerUrl}</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual fallback */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Keyboard size={16} className="text-gray-400" />
            <h3 className="text-sm font-medium text-gray-600">Saisie manuelle (douchette USB)</h3>
          </div>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="N° ID employé"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e40af] focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="bg-[#1e40af] text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors disabled:opacity-40"
            >
              Valider
            </button>
          </form>
        </div>

        {/* Result notification */}
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-500 z-50 ${scanResult ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
          {scanResult && (
            <div className={`px-8 py-5 rounded-2xl shadow-2xl min-w-[320px] ${
              scanResult.success ? 'bg-[#16a34a]' : 'bg-red-500'
            }`}>
              <p className="text-white font-bold text-lg">{scanResult.message}</p>
              <p className="text-white/80 text-sm mt-1">{scanResult.type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
