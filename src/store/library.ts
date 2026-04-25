import { create } from 'zustand';
import * as api from '../api/client';
import type { LibraryGame, LibraryLevel } from '../types/speedrun';

interface LibraryState {
  games: LibraryGame[];
  syncing: boolean;
  syncError: string | null;
  sync: () => Promise<void>;
  addGame: (payload: api.AddGamePayload) => Promise<void>;
  removeGame: (id: string) => Promise<void>;
  toggleLevel: (gameId: string, levelId: string) => Promise<void>;
  addLevel: (gameId: string, name: string) => Promise<void>;
  clear: () => void;
  hasGame: (id: string) => boolean;
  getGame: (id: string) => LibraryGame | undefined;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  games: [],
  syncing: false,
  syncError: null,

  sync: async () => {
    set({ syncing: true, syncError: null });
    try {
      const backendGames = await api.getLibrary();
      set({
        games: backendGames.map(api.backendToLibrary),
        syncing: false,
      });
    } catch (err) {
      set({
        syncing: false,
        syncError: err instanceof Error ? err.message : 'Erro ao sincronizar biblioteca',
      });
    }
  },

  addGame: async (payload) => {
    const bg = await api.addGame(payload);
    const game = api.backendToLibrary(bg);
    set(s => ({ games: [game, ...s.games] }));
  },

  removeGame: async (id) => {
    // Optimistic
    set(s => ({ games: s.games.filter(g => g.id !== id) }));
    try {
      await api.removeGame(id);
    } catch (err) {
      // Rollback on failure — re-sync
      get().sync();
      throw err;
    }
  },

  toggleLevel: async (gameId, levelId) => {
    // Optimistic toggle
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : {
              ...g,
              levels: g.levels.map((l: LibraryLevel) =>
                l.id === levelId ? { ...l, completed: !l.completed } : l
              ),
            }
      ),
    }));
    try {
      await api.toggleLevel(gameId, levelId);
    } catch {
      // Rollback on failure
      set(s => ({
        games: s.games.map(g =>
          g.id !== gameId
            ? g
            : {
                ...g,
                levels: g.levels.map((l: LibraryLevel) =>
                  l.id === levelId ? { ...l, completed: !l.completed } : l
                ),
              }
        ),
      }));
    }
  },

  addLevel: async (gameId, name) => {
    const level = await api.addLevel(gameId, name);
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : { ...g, levels: [...g.levels, { id: level.id, name: level.name, completed: false }] }
      ),
    }));
  },

  clear: () => set({ games: [], syncError: null }),

  hasGame: (id) => {
    const { games } = get();
    return games.some(g => g.speedrunId === id || g.id === id);
  },

  getGame: (id) => {
    const { games } = get();
    return games.find(g => g.speedrunId === id || g.id === id);
  },
}));
