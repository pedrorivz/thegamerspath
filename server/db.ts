import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'tgp.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS library_games (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    speedrun_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cover_url TEXT,
    abbreviation TEXT NOT NULL DEFAULT '',
    released INTEGER NOT NULL DEFAULT 0,
    platforms TEXT NOT NULL DEFAULT '[]',
    genres TEXT NOT NULL DEFAULT '[]',
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS library_levels (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    speedrun_level_id TEXT NOT NULL,
    name TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (game_id) REFERENCES library_games(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS game_notes (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES library_games(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_library_games_user_id ON library_games(user_id);
  CREATE INDEX IF NOT EXISTS idx_library_levels_game_id ON library_levels(game_id);
  CREATE INDEX IF NOT EXISTS idx_game_notes_game_id ON game_notes(game_id);
`);

// Migrations — each ALTER TABLE is safe to re-run (ignored if column exists)
try {
  db.exec('ALTER TABLE library_games ADD COLUMN ollama_status TEXT');
} catch { /* column already exists — ignore */ }

try {
  db.exec('ALTER TABLE library_games ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0');
} catch { /* column already exists — ignore */ }

export default db;
