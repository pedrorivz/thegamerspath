# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.2.0] — 2026-05-01

### Added

- **Manual game entry** — new bottom sheet form (`ManualGameForm`) lets users add any game to the library without a Speedrun.com match; accepts name (required), cover URL, release year, and platform; cover URL previews update after a 600 ms debounce
- **Ollama integration** — local AI-powered chapter extraction; when a game has no levels in the Speedrun.com API, the backend searches DuckDuckGo for walkthroughs, scrapes heading/list content via Cheerio, and uses a local LLM (via Ollama) to structure an ordered chapter list
- **Manual Ollama trigger** — "Buscar capítulos com Ollama" button on the game detail page for library games with no levels; includes real-time online/offline indicator
- **Ollama settings toggle** in Profile page to enable/disable the feature; preference persisted in localStorage
- **Processing banner** in GameDetail with spinner during Ollama extraction, polling `GET /api/library/:gameId/status` every 5 seconds; auto-syncs library on completion
- `GET /api/library/:gameId/status` endpoint — returns `ollamaStatus` and current `levelsCount` for a game
- `POST /api/library/:gameId/ollama` endpoint — triggers (or re-triggers) Ollama extraction for an existing library game
- `OLLAMA_URL` and `OLLAMA_MODEL` environment variables; Ollama is fully optional and gracefully disabled when unset
- `ollama_status` column on `library_games` via safe `ALTER TABLE` migration (values: `null | "processing" | "done" | "failed"`)
- `is_custom` column on `library_games` (integer 0/1) via safe migration — marks games added manually rather than from Speedrun.com

### Fixed

- Game detail page now shows library data (name, cover, level tracker) instead of "Jogo não encontrado" when a game's Speedrun.com ID is not found on the API — preserves progress tracking for all library entries
- Library page links now use `speedrunId` instead of backend UUID, fixing navigation from library to game detail (broken in the built image)
- Dockerfile now copies `server/ollama.ts`, fixing container startup crash introduced with the Ollama integration
- Manual game form bottom sheet no longer hidden behind the navigation bar — modal overlay z-index raised to `z-[60]` (navigation is `z-50`)
- Manual game form bottom sheet is now scrollable on small viewports — `max-height: 90dvh` with `overflow-y-auto` on the form body keeps the submit button pinned while fields scroll, preventing virtual keyboard clipping on mobile
- `addGame` and `addCustomGame` store actions now call `sync()` on API failure, ensuring any network error leaves the library in a consistent server-authoritative state with no ghost entries
- Year field in the manual game form now validates range (1970 – current year + 5) client-side before submission, matching the server-side constraint

### Changed

- `POST /api/library` now enforces strict input limits: name ≤ 120 chars, cover URL ≤ 500 chars and must start with `http(s)://`, abbreviation ≤ 20 chars, platforms/genres ≤ 10 items each at 40 chars per item, levels ≤ 500 with each name ≤ 100 chars, release year within a valid range — mitigates oversized payload injection

---

## [1.1.0] — 2026-04-25

### Added

- Manual level entry on game detail page — add custom chapter/level names to any library game via an inline form
- Bulk level import — paste multiple level names (one per line) into a textarea to add them all at once; toggle between single and bulk mode in the add-level form
- Notes / journal per game — add timestamped notes to any library game; supports create, inline edit, and delete with animated list
- Backup export — download full library (games, levels, notes) as a JSON file from the Profile page
- Backup import — restore library from a JSON backup file via the Profile page; shows a confirmation sheet warning that the current library will be replaced

### Fixed

- Library and Home page links now correctly use the Speedrun.com game ID instead of the internal backend UUID, fixing "Jogo não encontrado" when opening a game from the library

---

## [1.0.0] — 2026-04-25

### Added

- **Game search** powered by Speedrun.com API with multi-variant matching (partial names, abbreviations, underscored titles)
- **Game library** — add/remove games with cover art, platform, genre, and chapter list
- **Level/chapter tracker** — tap to toggle completion with animated progress bar
- **Celebratory effects** — canvas confetti + haptic vibration on game completion
- **Toast notifications** — feedback for add game, complete level, complete game, errors
- **Skeleton loaders** — shimmer placeholders during API calls
- **Framer Motion** page transitions and list animations
- **Optimized images** — blur-up placeholder while cover art loads
- **JWT authentication** — register/login with per-user library isolation
- **SQLite storage** — WAL mode, foreign keys, automatic schema migration on startup
- **Redis cache** — optional search and game detail caching (1h / 24h TTL)
- **Graceful Redis degradation** — app functions fully without Redis
- **Express backend** — REST API with protected routes, input validation
- **React lazy loading** — each page is a separate JS chunk
- **Docker support** — multi-stage Dockerfile, `docker-compose.yml` with Redis + persistent volumes
- **Makefile** — `make up`, `make down`, `make dev-all`, `make logs`, `make clean`
- **GitHub templates** — bug report, feature request, pull request template

[1.2.0]: https://github.com/pedrorivz/thegamerspath/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pedrorivz/thegamerspath/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pedrorivz/thegamerspath/releases/tag/v1.0.0
