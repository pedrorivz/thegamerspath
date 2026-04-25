import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import type { LibraryGame, LibraryLevel, GameNote } from '../types';

const router = Router();
router.use(requireAuth);

interface BackupLevel {
  name: string;
  speedrunLevelId: string;
  completed: boolean;
  completedAt: string | null;
}

interface BackupNote {
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface BackupGameEntry {
  speedrunId: string;
  name: string;
  coverUrl: string | null;
  abbreviation: string;
  released: number;
  platforms: string[];
  genres: string[];
  addedAt: string;
  levels: BackupLevel[];
  notes: BackupNote[];
}

interface BackupFile {
  version: number;
  exportedAt: string;
  games: BackupGameEntry[];
}

// GET /api/backup/export
router.get('/export', (req, res) => {
  const userId = req.user!.userId;

  const games = db
    .prepare('SELECT * FROM library_games WHERE user_id = ? ORDER BY added_at ASC')
    .all(userId) as LibraryGame[];

  const backupGames: BackupGameEntry[] = games.map(game => {
    const levels = db
      .prepare('SELECT * FROM library_levels WHERE game_id = ?')
      .all(game.id) as LibraryLevel[];
    const notes = db
      .prepare('SELECT * FROM game_notes WHERE game_id = ? ORDER BY created_at ASC')
      .all(game.id) as GameNote[];

    return {
      speedrunId: game.speedrun_id,
      name: game.name,
      coverUrl: game.cover_url,
      abbreviation: game.abbreviation,
      released: game.released,
      platforms: JSON.parse(game.platforms),
      genres: JSON.parse(game.genres),
      addedAt: game.added_at,
      levels: levels.map(l => ({
        name: l.name,
        speedrunLevelId: l.speedrun_level_id,
        completed: l.completed === 1,
        completedAt: l.completed_at,
      })),
      notes: notes.map(n => ({
        content: n.content,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })),
    };
  });

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    games: backupGames,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tgp-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(backup);
});

// POST /api/backup/import
router.post('/import', (req, res) => {
  const userId = req.user!.userId;
  const backup = req.body as BackupFile;

  if (!backup || backup.version !== 1 || !Array.isArray(backup.games)) {
    res.status(400).json({ error: 'Arquivo de backup inválido' });
    return;
  }

  const insertGame = db.prepare(`
    INSERT INTO library_games (id, user_id, speedrun_id, name, cover_url, abbreviation, released, platforms, genres, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLevel = db.prepare(`
    INSERT INTO library_levels (id, game_id, speedrun_level_id, name, completed, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertNote = db.prepare(`
    INSERT INTO game_notes (id, game_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const doImport = db.transaction(() => {
    db.prepare('DELETE FROM library_games WHERE user_id = ?').run(userId);

    for (const entry of backup.games) {
      if (!entry.speedrunId || !entry.name) continue;

      const gameId = randomUUID();
      insertGame.run(
        gameId,
        userId,
        entry.speedrunId,
        entry.name,
        entry.coverUrl ?? null,
        entry.abbreviation ?? '',
        entry.released ?? 0,
        JSON.stringify(Array.isArray(entry.platforms) ? entry.platforms : []),
        JSON.stringify(Array.isArray(entry.genres) ? entry.genres : []),
        entry.addedAt ?? new Date().toISOString(),
      );

      for (const level of (entry.levels ?? [])) {
        if (!level.name) continue;
        const levelId = randomUUID();
        insertLevel.run(
          levelId,
          gameId,
          level.speedrunLevelId ?? levelId,
          level.name,
          level.completed ? 1 : 0,
          level.completedAt ?? null,
        );
      }

      for (const note of (entry.notes ?? [])) {
        if (!note.content) continue;
        const noteId = randomUUID();
        insertNote.run(
          noteId,
          gameId,
          note.content,
          note.createdAt ?? new Date().toISOString(),
          note.updatedAt ?? new Date().toISOString(),
        );
      }
    }
  });

  doImport();

  res.json({ data: { imported: backup.games.length } });
});

export default router;
