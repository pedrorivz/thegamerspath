import type { LibraryGame } from '../types/speedrun';

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface BackendLevel {
  id: string;
  speedrunLevelId: string;
  name: string;
  completed: boolean;
  completedAt: string | null;
}

export interface BackendNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendGame {
  id: string;
  speedrunId: string;
  name: string;
  coverUrl: string | null;
  abbreviation: string;
  released: number;
  platforms: string[];
  genres: string[];
  levels: BackendLevel[];
  notes: BackendNote[];
  addedAt: string;
}

export interface AddGamePayload {
  speedrun_id: string;
  name: string;
  cover_url?: string | null;
  abbreviation?: string;
  released?: number;
  platforms?: string[];
  genres?: string[];
  levels: { id: string; name: string }[];
}

class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('tgp-token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const body = await res.json();
  if (!res.ok) {
    throw new APIError(res.status, body.error ?? 'Erro desconhecido');
  }
  return body as T;
}

// Auth
export async function register(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function me(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/me');
}

// Library
export async function getLibrary(): Promise<BackendGame[]> {
  const res = await request<{ data: BackendGame[] }>('/library');
  return res.data;
}

export async function addGame(payload: AddGamePayload): Promise<BackendGame> {
  const res = await request<{ data: BackendGame }>('/library', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function removeGame(gameId: string): Promise<void> {
  await request(`/library/${gameId}`, { method: 'DELETE' });
}

export async function toggleLevel(
  gameId: string,
  levelId: string
): Promise<BackendLevel> {
  const res = await request<{ data: BackendLevel }>(`/library/${gameId}/level`, {
    method: 'PATCH',
    body: JSON.stringify({ levelId }),
  });
  return res.data;
}

export async function addLevel(gameId: string, name: string): Promise<BackendLevel> {
  const res = await request<{ data: BackendLevel }>(`/library/${gameId}/levels`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function addLevels(gameId: string, names: string[]): Promise<BackendLevel[]> {
  const res = await request<{ data: BackendLevel[] }>(`/library/${gameId}/levels/bulk`, {
    method: 'POST',
    body: JSON.stringify({ names }),
  });
  return res.data;
}

// Games (proxied & cached by backend)
export async function searchGames(query: string): Promise<unknown[]> {
  const res = await request<{ data: unknown[] }>(
    `/games/search?q=${encodeURIComponent(query)}`
  );
  return res.data;
}

export async function getGameById(id: string): Promise<unknown> {
  const res = await request<{ data: unknown }>(`/games/${id}`);
  return (res as { data: unknown }).data ?? res;
}

// Note endpoints
export async function addNote(gameId: string, content: string): Promise<BackendNote> {
  const res = await request<{ data: BackendNote }>(`/library/${gameId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function updateNote(gameId: string, noteId: string, content: string): Promise<BackendNote> {
  const res = await request<{ data: BackendNote }>(`/library/${gameId}/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function deleteNote(gameId: string, noteId: string): Promise<void> {
  await request(`/library/${gameId}/notes/${noteId}`, { method: 'DELETE' });
}

// Backup endpoints
export async function exportBackup(): Promise<Blob> {
  const token = localStorage.getItem('tgp-token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/backup/export', { headers });
  if (!res.ok) throw new APIError(res.status, 'Falha ao exportar backup');
  return res.blob();
}

export async function importBackup(data: unknown): Promise<{ imported: number }> {
  const res = await request<{ data: { imported: number } }>('/backup/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Convert backend game to LibraryGame shape used by Zustand store
export function backendToLibrary(bg: BackendGame): LibraryGame {
  return {
    id: bg.id,
    speedrunId: bg.speedrunId,
    name: bg.name,
    coverUrl: bg.coverUrl,
    abbreviation: bg.abbreviation,
    released: bg.released,
    platforms: bg.platforms,
    genres: bg.genres,
    levels: bg.levels.map(l => ({
      id: l.id,
      name: l.name,
      completed: l.completed,
    })),
    notes: (bg.notes ?? []).map(n => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    addedAt: new Date(bg.addedAt).getTime(),
  };
}

export { APIError };
