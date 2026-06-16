import { useState, useRef, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, Result, Exception } from '@zxing/library';

interface UseBarcodeScannerOptions {
  onScan: (code: string) => void;
  debounceMs?: number;
}

export function useBarcodeScanner({ onScan, debounceMs = 2000 }: UseBarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  const startScan = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    setIsScanning(true);

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error("Aucune caméra trouvée");
      }

      // Priority to back camera
      let selectedDeviceId = videoInputDevices[0].deviceId;
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('arrière') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      }

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId, 
        videoRef.current, 
        (result: Result | undefined, err: Exception | undefined) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();
            
            // Anti-duplicate logic
            if (lastScanRef.current) {
              if (lastScanRef.current.code === code && now - lastScanRef.current.time < debounceMs) {
                return; // Skip if same code scanned within debounce time
              }
            }
            
            lastScanRef.current = { code, time: now };
            onScan(code);
          }
          if (err && err.name !== 'NotFoundException') {
            // console.warn(err);
          }
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur d'accès à la caméra");
      setIsScanning(false);
    }
  }, [onScan, debounceMs]);

  const stopScan = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScan(); // Cleanup on unmount
    };
  }, [stopScan]);

  return { videoRef, isScanning, startScan, stopScan, error };
}
