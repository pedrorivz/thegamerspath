export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface LibraryGame {
  id: string;
  user_id: number;
  speedrun_id: string;
  name: string;
  cover_url: string | null;
  abbreviation: string;
  released: number;
  platforms: string;
  genres: string;
  added_at: string;
}

export interface LibraryLevel {
  id: string;
  game_id: string;
  speedrun_level_id: string;
  name: string;
  completed: number;
  completed_at: string | null;
}

export interface AddGameBody {
  speedrun_id: string;
  name: string;
  cover_url?: string | null;
  abbreviation?: string;
  released?: number;
  platforms?: string[];
  genres?: string[];
  levels: { id: string; name: string }[];
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
