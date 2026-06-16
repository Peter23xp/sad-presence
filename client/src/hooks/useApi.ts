import { useState, useEffect } from 'react';

// Custom Toast System
type ToastType = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let currentToasts: Toast[] = [];
let nextToastId = 0;

export const triggerToast = (message: string, type: ToastType = 'info') => {
  const id = nextToastId++;
  const newToast = { id, message, type };
  currentToasts = [...currentToasts, newToast];
  toastListeners.forEach(listener => listener(currentToasts));

  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(currentToasts));
  }, 4000);
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToasts);
    };
  }, []);

  return toasts;
}

// Hook générique useFetch
export function useFetch<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          triggerToast(`Erreur réseau: ${err.message}`, 'error');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [url, options]); // Warning: options should be memoized

  return { data, loading, error };
}

// Fonction utilitaire pour POST/PUT/DELETE
export const api = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    
    if (!res.ok) {
      const errMsg = data.error || `Erreur serveur (${res.status})`;
      triggerToast(errMsg, 'error');
      throw new Error(errMsg);
    }
    
    // Succès silencieux pour ne pas spammer, sauf si vous voulez forcer :
    // triggerToast('Opération réussie', 'success');
    return data;
  } catch (err: any) {
    if (!err.message.includes('Erreur serveur')) {
      triggerToast(`Problème de connexion: ${err.message}`, 'error');
    }
    throw err;
  }
};
