import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { extractChapters } from '../ollama';
import type { OllamaClient } from '../ollama';
import type { LibraryGame, LibraryLevel, AddGameBody, GameNote } from '../types';

function formatNote(n: GameNote) {
  return {
    id: n.id,
    content: n.content,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

function formatGame(game: LibraryGame, levels: LibraryLevel[], notes: GameNote[] = []) {
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
    notes: notes.map(formatNote),
    ollamaStatus: game.ollama_status ?? null,
    addedAt: game.added_at,
  };
}

async function processOllamaChapters(
  gameId: string,
  gameName: string,
  client: OllamaClient,
): Promise<void> {
  try {
    const chapters = await extractChapters(client, gameName);
    if (chapters.length === 0) {
      db.prepare("UPDATE library_games SET ollama_status = 'failed' WHERE id = ?").run(gameId);
      return;
    }
    const insertLevel = db.prepare(
      'INSERT INTO library_levels (id, game_id, speedrun_level_id, name) VALUES (?, ?, ?, ?)',
    );
    const finish = db.transaction(() => {
      for (const ch of chapters) {
        const levelId = randomUUID();
        insertLevel.run(levelId, gameId, levelId, ch.name);
      }
      db.prepare("UPDATE library_games SET ollama_status = 'done' WHERE id = ?").run(gameId);
    });
    finish();
    console.log(`[Ollama] ${chapters.length} capítulo(s) extraídos para gameId=${gameId}`);
  } catch (err) {
    console.error('[Ollama] Falha ao processar capítulos:', err);
    db.prepare("UPDATE library_games SET ollama_status = 'failed' WHERE id = ?").run(gameId);
  }
}

// getOllama is a getter so the route always reads the latest Ollama client value
export function createLibraryRouter(getOllama: () => OllamaClient | null) {
  const router = Router();

  router.use(requireAuth);

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
      const notes = db
        .prepare('SELECT * FROM game_notes WHERE game_id = ? ORDER BY created_at DESC')
        .all(game.id) as GameNote[];
      return formatGame(game, levels, notes);
    });

    res.json({ data: result });
  });

  // GET /api/library/:gameId/status
  router.get('/:gameId/status', (req, res) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;

    const game = db
      .prepare('SELECT ollama_status FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId) as Pick<LibraryGame, 'ollama_status'> | undefined;

    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM library_levels WHERE game_id = ?')
      .get(gameId) as { count: number };

    res.json({ data: { ollamaStatus: game.ollama_status ?? null, levelsCount: count } });
  });

  // POST /api/library/:gameId/ollama — trigger Ollama extraction for existing game
  router.post('/:gameId/ollama', (req, res) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;

    const ollama = getOllama();
    if (!ollama) {
      res.status(503).json({ error: 'Ollama não está disponível no servidor' });
      return;
    }

    const game = db
      .prepare('SELECT * FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId) as LibraryGame | undefined;

    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado na biblioteca' });
      return;
    }

    if (game.ollama_status === 'processing') {
      res.status(409).json({ error: 'Extração já está em andamento' });
      return;
    }

    db.prepare("UPDATE library_games SET ollama_status = 'processing' WHERE id = ?").run(gameId);
    processOllamaChapters(gameId, game.name, ollama).catch(() => {});

    res.status(202).json({ data: { ollamaStatus: 'processing' } });
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

    const ollama = getOllama();
    const useOllamaMode = body.useOllama === true && body.levels.length === 0 && ollama !== null;
    const ollamaStatus = useOllamaMode ? 'processing' : null;

    const gameId = randomUUID();
    const insertGame = db.prepare(`
      INSERT INTO library_games (id, user_id, speedrun_id, name, cover_url, abbreviation, released, platforms, genres, ollama_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        JSON.stringify(body.genres ?? []),
        ollamaStatus,
      );
      if (!useOllamaMode) {
        for (const level of body.levels) {
          insertLevel.run(randomUUID(), gameId, level.id, level.name);
        }
      }
    });

    insertAll();

    if (useOllamaMode && ollama) {
      // Fire-and-forget — response is already sent below
      processOllamaChapters(gameId, body.name, ollama).catch(() => {/* handled inside */});
    }

    const game = db.prepare('SELECT * FROM library_games WHERE id = ?').get(gameId) as LibraryGame;
    const levels = db.prepare('SELECT * FROM library_levels WHERE game_id = ?').all(gameId) as LibraryLevel[];

    res.status(201).json({ data: formatGame(game, levels, []) });
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
      'UPDATE library_levels SET completed = ?, completed_at = ? WHERE id = ?',
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

  // POST /api/library/:gameId/levels  — add a manual level
  router.post('/:gameId/levels', (req, res) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const { name } = req.body as { name: string };

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nome da fase é obrigatório' });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({ error: 'Nome deve ter no máximo 100 caracteres' });
      return;
    }

    const game = db
      .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId);

    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const levelId = randomUUID();
    db.prepare(
      'INSERT INTO library_levels (id, game_id, speedrun_level_id, name) VALUES (?, ?, ?, ?)',
    ).run(levelId, gameId, levelId, name.trim());

    const level = db
      .prepare('SELECT * FROM library_levels WHERE id = ?')
      .get(levelId) as LibraryLevel;

    res.status(201).json({
      data: {
        id: level.id,
        speedrunLevelId: level.speedrun_level_id,
        name: level.name,
        completed: false,
        completedAt: null,
      },
    });
  });

  // POST /api/library/:gameId/notes
  router.post('/:gameId/notes', (req, res) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const { content } = req.body as { content: string };

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Conteúdo da nota é obrigatório' });
      return;
    }

    const game = db
      .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId);
    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const noteId = randomUUID();
    db.prepare(
      'INSERT INTO game_notes (id, game_id, content) VALUES (?, ?, ?)',
    ).run(noteId, gameId, content.trim());

    const note = db.prepare('SELECT * FROM game_notes WHERE id = ?').get(noteId) as GameNote;
    res.status(201).json({ data: formatNote(note) });
  });

  // PATCH /api/library/:gameId/notes/:noteId
  router.patch('/:gameId/notes/:noteId', (req, res) => {
    const userId = req.user!.userId;
    const { gameId, noteId } = req.params;
    const { content } = req.body as { content: string };

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Conteúdo da nota é obrigatório' });
      return;
    }

    const game = db
      .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId);
    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const note = db
      .prepare('SELECT id FROM game_notes WHERE id = ? AND game_id = ?')
      .get(noteId, gameId);
    if (!note) {
      res.status(404).json({ error: 'Nota não encontrada' });
      return;
    }

    db.prepare(
      "UPDATE game_notes SET content = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(content.trim(), noteId);

    const updated = db.prepare('SELECT * FROM game_notes WHERE id = ?').get(noteId) as GameNote;
    res.json({ data: formatNote(updated) });
  });

  // DELETE /api/library/:gameId/notes/:noteId
  router.delete('/:gameId/notes/:noteId', (req, res) => {
    const userId = req.user!.userId;
    const { gameId, noteId } = req.params;

    const game = db
      .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId);
    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const note = db
      .prepare('SELECT id FROM game_notes WHERE id = ? AND game_id = ?')
      .get(noteId, gameId);
    if (!note) {
      res.status(404).json({ error: 'Nota não encontrada' });
      return;
    }

    db.prepare('DELETE FROM game_notes WHERE id = ?').run(noteId);
    res.status(204).send();
  });

  // POST /api/library/:gameId/levels/bulk  — add multiple levels at once
  router.post('/:gameId/levels/bulk', (req, res) => {
    const userId = req.user!.userId;
    const { gameId } = req.params;
    const { names } = req.body as { names: unknown };

    if (!Array.isArray(names) || names.length === 0) {
      res.status(400).json({ error: 'names deve ser um array não vazio' });
      return;
    }

    const trimmed = (names as unknown[])
      .filter((n): n is string => typeof n === 'string')
      .map(n => n.trim())
      .filter(n => n.length > 0 && n.length <= 100);

    if (trimmed.length === 0) {
      res.status(400).json({ error: 'Nenhum nome de fase válido fornecido' });
      return;
    }

    const game = db
      .prepare('SELECT id FROM library_games WHERE id = ? AND user_id = ?')
      .get(gameId, userId);

    if (!game) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    const insertLevel = db.prepare(
      'INSERT INTO library_levels (id, game_id, speedrun_level_id, name) VALUES (?, ?, ?, ?)',
    );

    const insertAll = db.transaction(() => {
      return trimmed.map(name => {
        const levelId = randomUUID();
        insertLevel.run(levelId, gameId, levelId, name);
        return levelId;
      });
    });

    const ids = insertAll() as string[];

    const levels = ids.map(id =>
      db.prepare('SELECT * FROM library_levels WHERE id = ?').get(id) as LibraryLevel,
    );

    res.status(201).json({
      data: levels.map(l => ({
        id: l.id,
        speedrunLevelId: l.speedrun_level_id,
        name: l.name,
        completed: false,
        completedAt: null,
      })),
    });
  });

  return router;
}
