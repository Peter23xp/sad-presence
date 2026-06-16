import { useState } from 'react';

interface AuthState {
  token: string | null;
  username: string | null;
}

const AUTH_KEY = 'sad_auth';

export function getToken(): string | null {
  return localStorage.getItem(AUTH_KEY + '_token');
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem(AUTH_KEY + '_token'),
    username: localStorage.getItem(AUTH_KEY + '_user'),
  });

  const login = (token: string, username: string) => {
    localStorage.setItem(AUTH_KEY + '_token', token);
    localStorage.setItem(AUTH_KEY + '_user', username);
    setAuth({ token, username });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY + '_token');
    localStorage.removeItem(AUTH_KEY + '_user');
    setAuth({ token: null, username: null });
  };

  return { ...auth, login, logout, isAuthenticated: !!auth.token };
}

// Fetch wrapper qui ajoute le token automatiquement
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // Allow overriding Content-Type (e.g. for multipart)
  const optHeaders = options.headers as Record<string, string> | undefined;
  if (optHeaders) {
    Object.assign(headers, optHeaders);
  }
  return fetch(url, { ...options, headers });
}
