import { create } from 'zustand';
import * as api from '../api/client';

interface AuthState {
  token: string | null;
  user: api.AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, _get) => ({
  token: localStorage.getItem('tgp-token'),
  user: null,
  loading: false,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('tgp-token');
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { user } = await api.me();
      set({ token, user, initialized: true });
    } catch {
      localStorage.removeItem('tgp-token');
      set({ token: null, user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const result = await api.login(email, password);
      localStorage.setItem('tgp-token', result.token);
      set({ token: result.token, user: result.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (email, password) => {
    set({ loading: true });
    try {
      const result = await api.register(email, password);
      localStorage.setItem('tgp-token', result.token);
      set({ token: result.token, user: result.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('tgp-token');
    set({ token: null, user: null });
    // useLibrary clear is called by the component
  },
}));

export function isAuthenticated(): boolean {
  return useAuth.getState().token !== null;
}
