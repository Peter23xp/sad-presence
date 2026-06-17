import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Download, Printer } from 'lucide-react';

interface BarcodeModalProps {
  employe: {
    id: number;
    numero_id: string;
    nom: string;
    prenom: string;
    poste?: string;
    departement?: string;
  };
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ employe, onClose }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, employe.numero_id, {
        format: 'CODE128',
        width: 2.5,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 16,
        background: '#ffffff',
        lineColor: '#1e293b',
      });
    }
  }, [employe.numero_id]);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const canvas = document.createElement('canvas');
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      // Add padding for the card design
      canvas.width = img.width + 80;
      canvas.height = img.height + 120;
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Blue header bar
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(0, 0, canvas.width, 36);

      // Header text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('SAD-International', canvas.width / 2, 23);

      // Employee name
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`${employe.prenom} ${employe.nom}`, canvas.width / 2, 60);

      // Department / Poste
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Arial';
      ctx.fillText(employe.poste || employe.departement || '', canvas.width / 2, 78);

      // Barcode image
      ctx.drawImage(img, 40, 90);

      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `badge_${employe.numero_id.replace(/\s/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  const handlePrint = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const win = window.open('', '_blank', 'width=400,height=300');
    if (!win) return;
    win.document.write(`
      <html><head><title>Badge — ${employe.prenom} ${employe.nom}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; display: flex; justify-content: center; }
        .card { border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; width: 320px; }
        .header { background: #1e40af; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; }
        .body { padding: 16px; text-align: center; }
        .name { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
        .sub { font-size: 12px; color: #64748b; margin-bottom: 12px; }
        svg { max-width: 100%; }
      </style></head>
      <body>
        <div class="card">
          <div class="header">SAD-International</div>
          <div class="body">
            <p class="name">${employe.prenom} ${employe.nom}</p>
            <p class="sub">${employe.poste || employe.departement || ''}</p>
            ${svgData}
          </div>
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#07bb20] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{employe.prenom} {employe.nom}</p>
            <p className="text-blue-200 text-xs mt-0.5">{employe.poste || employe.departement || ''}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <X size={20} />
          </button>
        </div>

        {/* Barcode */}
        <div className="px-6 py-8 flex justify-center bg-gray-50">
          <svg ref={svgRef} />
        </div>

        {/* ID */}
        <div className="text-center pb-4">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {employe.numero_id}
          </span>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium text-sm"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#07bb20] text-white rounded-xl hover:bg-[#069e1b] transition font-medium text-sm"
          >
            <Download size={16} />
            Télécharger
          </button>
        </div>
      </div>
    </div>
  );
};
