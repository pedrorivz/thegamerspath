import type { SpeedrunGame, SpeedrunSearchResult, SpeedrunLevel } from '../types/speedrun';

const BASE = 'https://www.speedrun.com/api/v1';

function normalizeQuery(raw: string): string[] {
  const clean = raw.trim().toLowerCase();
  const variants = new Set<string>();

  variants.add(clean);
  // "super mario" → "super_mario", "supermario"
  variants.add(clean.replace(/\s+/g, '_'));
  variants.add(clean.replace(/\s+/g, ''));
  // "super_mario" → "super mario"
  variants.add(clean.replace(/_/g, ' '));
  // Abbreviation-friendly: take first letters "the legend of zelda" → "tloz"
  const abbr = clean.split(/[\s_]+/).map(w => w[0]).join('');
  if (abbr.length > 1) variants.add(abbr);

  return Array.from(variants);
}

export async function searchGames(query: string, max = 20): Promise<SpeedrunGame[]> {
  if (!query.trim()) return [];

  const variants = normalizeQuery(query);
  const seen = new Set<string>();
  const results: SpeedrunGame[] = [];

  await Promise.all(
    variants.map(async (variant) => {
      try {
        const url = `${BASE}/games?name=${encodeURIComponent(variant)}&max=${max}&embed=levels,platforms,genres`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json: SpeedrunSearchResult = await res.json();
        for (const game of json.data) {
          if (!seen.has(game.id)) {
            seen.add(game.id);
            results.push(game);
          }
        }
      } catch {
        // silently ignore individual variant failures
      }
    })
  );

  return results;
}

export async function getGame(id: string): Promise<SpeedrunGame | null> {
  try {
    const res = await fetch(`${BASE}/games/${id}?embed=levels,platforms,genres`);
    if (!res.ok) return null;
    const json: { data: SpeedrunGame } = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function getGameLevels(id: string): Promise<SpeedrunLevel[]> {
  try {
    const res = await fetch(`${BASE}/games/${id}/levels`);
    if (!res.ok) return [];
    const json: { data: SpeedrunLevel[] } = await res.json();
    return json.data;
  } catch {
    return [];
  }
}

export function getCoverUrl(game: SpeedrunGame): string | null {
  return (
    game.assets?.['cover-large']?.uri ||
    game.assets?.['cover-medium']?.uri ||
    game.assets?.['cover-small']?.uri ||
    null
  );
}

export function getPlatformNames(game: SpeedrunGame): string[] {
  if (!game.platforms) return [];
  if (Array.isArray(game.platforms)) return [];
  return (game.platforms as { data: { name: string }[] }).data.map(p => p.name);
}

export function getGenreNames(game: SpeedrunGame): string[] {
  if (!game.genres) return [];
  if (Array.isArray(game.genres)) return [];
  return (game.genres as { data: { name: string }[] }).data.map(g => g.name);
}

export function getLevels(game: SpeedrunGame): { id: string; name: string }[] {
  if (!game.levels) return [];
  return game.levels.data.map(l => ({ id: l.id, name: l.name }));
}
