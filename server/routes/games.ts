import { Router } from 'express';
import type { Redis } from 'ioredis';

const router = Router();

const SPEEDRUN_BASE = 'https://www.speedrun.com/api/v1';
const SEARCH_CACHE_TTL = 3600;
const GAME_CACHE_TTL = 86400;

function normalizeVariants(raw: string): string[] {
  const clean = raw.trim().toLowerCase();
  const variants = new Set<string>();
  variants.add(clean);
  variants.add(clean.replace(/\s+/g, '_'));
  variants.add(clean.replace(/\s+/g, ''));
  variants.add(clean.replace(/_/g, ' '));
  const abbr = clean.split(/[\s_]+/).map((w: string) => w[0]).join('');
  if (abbr.length > 1) variants.add(abbr);
  return Array.from(variants);
}

export function createGamesRouter(redis: Redis | null) {
  // GET /api/games/search?q=...
  router.get('/search', async (req, res) => {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      res.json({ data: [] });
      return;
    }

    const cacheKey = `search:${query.toLowerCase()}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          res.json(JSON.parse(cached));
          return;
        }
      } catch {
        // Redis unavailable — continue without cache
      }
    }

    const variants = normalizeVariants(query);
    const seen = new Set<string>();
    const results: unknown[] = [];

    await Promise.all(
      variants.map(async variant => {
        try {
          const url = `${SPEEDRUN_BASE}/games?name=${encodeURIComponent(variant)}&max=20&embed=levels,platforms,genres`;
          const response = await fetch(url);
          if (!response.ok) return;
          const json = await response.json() as { data: Array<{ id: string }> };
          for (const game of json.data) {
            if (!seen.has(game.id)) {
              seen.add(game.id);
              results.push(game);
            }
          }
        } catch {
          // Ignore individual variant failures
        }
      })
    );

    const payload = { data: results };

    if (redis) {
      try {
        await redis.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(payload));
      } catch {
        // Non-critical
      }
    }

    res.set('X-Cache', 'MISS');
    res.json(payload);
  });

  // GET /api/games/:id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;

    // Custom games are not in the Speedrun.com database — skip the outbound call
    if (id.startsWith('manual_')) {
      res.status(404).json({ error: 'Jogo customizado — sem entrada na Speedrun.com' });
      return;
    }

    const cacheKey = `game:${id}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          res.json(JSON.parse(cached));
          return;
        }
      } catch {
        // Continue without cache
      }
    }

    try {
      const url = `${SPEEDRUN_BASE}/games/${id}?embed=levels,platforms,genres`;
      const response = await fetch(url);

      if (!response.ok) {
        res.status(response.status).json({ error: 'Jogo não encontrado na Speedrun API' });
        return;
      }

      const json = await response.json() as unknown;
      const payload = json;

      if (redis) {
        try {
          await redis.setex(cacheKey, GAME_CACHE_TTL, JSON.stringify(payload));
        } catch {
          // Non-critical
        }
      }

      res.set('X-Cache', 'MISS');
      res.json(payload);
    } catch {
      res.status(502).json({ error: 'Erro ao contatar a Speedrun API' });
    }
  });

  return router;
}
