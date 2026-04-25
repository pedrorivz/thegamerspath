# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[1.1.0]: https://github.com/pedrorivz/thegamerspath/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pedrorivz/thegamerspath/releases/tag/v1.0.0
