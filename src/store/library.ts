import { create } from 'zustand';
import * as api from '../api/client';
import type { LibraryGame, LibraryLevel, LibraryNote } from '../types/speedrun';

interface LibraryState {
  games: LibraryGame[];
  syncing: boolean;
  syncError: string | null;
  sync: () => Promise<void>;
  addGame: (payload: api.AddGamePayload) => Promise<void>;
  removeGame: (id: string) => Promise<void>;
  toggleLevel: (gameId: string, levelId: string) => Promise<void>;
  addLevel: (gameId: string, name: string) => Promise<void>;
  addLevels: (gameId: string, names: string[]) => Promise<void>;
  addNote: (gameId: string, content: string) => Promise<void>;
  updateNote: (gameId: string, noteId: string, content: string) => Promise<void>;
  deleteNote: (gameId: string, noteId: string) => Promise<void>;
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

  addLevels: async (gameId, names) => {
    const levels = await api.addLevels(gameId, names);
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : {
              ...g,
              levels: [
                ...g.levels,
                ...levels.map(l => ({ id: l.id, name: l.name, completed: false })),
              ],
            }
      ),
    }));
  },

  addNote: async (gameId, content) => {
    const note = await api.addNote(gameId, content);
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : { ...g, notes: [{ id: note.id, content: note.content, createdAt: note.createdAt, updatedAt: note.updatedAt }, ...g.notes] }
      ),
    }));
  },

  updateNote: async (gameId, noteId, content) => {
    const note = await api.updateNote(gameId, noteId, content);
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : {
              ...g,
              notes: g.notes.map((n: LibraryNote) =>
                n.id === noteId ? { ...n, content: note.content, updatedAt: note.updatedAt } : n
              ),
            }
      ),
    }));
  },

  deleteNote: async (gameId, noteId) => {
    set(s => ({
      games: s.games.map(g =>
        g.id !== gameId
          ? g
          : { ...g, notes: g.notes.filter((n: LibraryNote) => n.id !== noteId) }
      ),
    }));
    try {
      await api.deleteNote(gameId, noteId);
    } catch {
      get().sync();
      throw new Error('Não foi possível remover a nota');
    }
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
