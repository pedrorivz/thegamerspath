import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import type { LibraryGame, LibraryLevel, AddGameBody } from '../types';

const router = Router();

router.use(requireAuth);

function formatGame(game: LibraryGame, levels: LibraryLevel[]) {
  return {
    id: game.id,
    speedrunId: game.speedrun_id,
    name: game.name,
    coverUrl: game.cover_url,
    abbreviation: game.abbreviation,
    released: game.released,
    platforms: JSON.parse(game.platforms),
    genres: JSON.parse(game.genres),
    levels: levels.map(l => ({
      id: l.id,
      speedrunLevelId: l.speedrun_level_id,
      name: l.name,
      completed: l.completed === 1,
      completedAt: l.completed_at,
    })),
    addedAt: game.added_at,
  };
}

// GET /api/library
router.get('/', (req, res) => {
  const userId = req.user!.userId;

  const games = db
    .prepare('SELECT * FROM library_games WHERE user_id = ? ORDER BY added_at DESC')
    .all(userId) as LibraryGame[];

  const result = games.map(game => {
    const levels = db
      .prepare('SELECT * FROM library_levels WHERE game_id = ?')
      .all(game.id) as LibraryLevel[];
    return formatGame(game, levels);
  });

  res.json({ data: result });
});

// POST /api/library
router.post('/', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as AddGameBody;

  if (!body.speedrun_id || !body.name || !Array.isArray(body.levels)) {
    res.status(400).json({ error: 'speedrun_id, name e levels são obrigatórios' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM library_games WHERE user_id = ? AND speedrun_id = ?')
    .get(userId, body.speedrun_id);
  if (existing) {
    res.status(409).json({ error: 'Jogo já está na biblioteca' });
    return;
  }

  const gameId = randomUUID();
  const insertGame = db.prepare(`
    INSERT INTO library_games (id, user_id, speedrun_id, name, cover_url, abbreviation, released, platforms, genres)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLevel = db.prepare(`
    INSERT INTO library_levels (id, game_id, speedrun_level_id, name)
    VALUES (?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    insertGame.run(
      gameId,
      userId,
      body.speedrun_id,
      body.name,
      body.cover_url ?? null,
      body.abbreviation ?? '',
      body.released ?? 0,
      JSON.stringify(body.platforms ?? []),
      JSON.stringify(body.genres ?? [])
    );

    for (const level of body.levels) {
      insertLevel.run(randomUUID(), gameId, level.id, level.name);
    }
  });

  insertAll();

  const game = db.prepare('SELECT * FROM library_games WHERE id = ?').get(gameId) as LibraryGame;
  const levels = db.prepare('SELECT * FROM library_levels WHERE game_id = ?').all(gameId) as LibraryLevel[];

  res.status(201).json({ data: formatGame(game, levels) });
});

// DELETE /api/library/:gameId
router.delete('/:gameId', (req, res) => {
  const userId = req.user!.userId;
  const { gameId } = req.params;

  const game = db
    .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
    .get(gameId, userId);

  if (!game) {
    res.status(404).json({ error: 'Jogo não encontrado na biblioteca' });
    return;
  }

  db.prepare('DELETE FROM library_games WHERE id = ?').run(gameId);
  res.status(204).send();
});

// PATCH /api/library/:gameId/level
router.patch('/:gameId/level', (req, res) => {
  const userId = req.user!.userId;
  const { gameId } = req.params;
  const { levelId } = req.body as { levelId: string };

  if (!levelId) {
    res.status(400).json({ error: 'levelId é obrigatório' });
    return;
  }

  const game = db
    .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
    .get(gameId, userId);

  if (!game) {
    res.status(404).json({ error: 'Jogo não encontrado' });
    return;
  }

  const level = db
    .prepare('SELECT * FROM library_levels WHERE id = ? AND game_id = ?')
    .get(levelId, gameId) as LibraryLevel | undefined;

  if (!level) {
    res.status(404).json({ error: 'Fase não encontrada' });
    return;
  }

  const nowCompleted = level.completed === 0 ? 1 : 0;
  const completedAt = nowCompleted === 1 ? new Date().toISOString() : null;

  db.prepare(
    'UPDATE library_levels SET completed = ?, completed_at = ? WHERE id = ?'
  ).run(nowCompleted, completedAt, levelId);

  const updated = db
    .prepare('SELECT * FROM library_levels WHERE id = ?')
    .get(levelId) as LibraryLevel;

  res.json({
    data: {
      id: updated.id,
      name: updated.name,
      completed: updated.completed === 1,
      completedAt: updated.completed_at,
    },
  });
});

export default router;
