<div align="center">

# 🎮 The Gamer's Path

**Track your journey through single-player games — chapter by chapter.**

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Docker Image](https://img.shields.io/badge/ghcr.io-pedrorivz%2Fthegamerspath-blue?logo=github)](https://ghcr.io/pedrorivz/thegamerspath)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://typescriptlang.org)
[![Self-Hosted](https://img.shields.io/badge/self--hosted-ready-brightgreen)](https://github.com/pedrorivz/thegamerspath)

</div>

---

The Gamer's Path (TGP) is a mobile-first web app to track your progress through single-player games. Search any game using the [Speedrun.com API](https://www.speedrun.com/api), add it to your personal library, and mark chapters/levels as you complete them.

Designed to be **self-hosted**, **open source**, and fast on mobile.

## ✨ Features

- **Game search** — smart matching with partial names, abbreviations (`tloz`, `smb`), and underscored titles, powered by Speedrun.com API
- **Game library** — add games with cover art, platform, genre, and chapter list fetched automatically
- **Level/chapter tracker** — tap to mark levels complete with smooth animated progress bars
- **Celebratory feedback** — confetti burst + haptic vibration when you complete a game
- **Per-user accounts** — JWT authentication, each user has their own private library
- **Persistent storage** — SQLite for data, Redis for search caching (Redis is optional)
- **Single container** — `docker compose up` and you're done

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Animations | Framer Motion, CSS keyframes, Canvas confetti |
| State | Zustand |
| Routing | React Router v7 |
| Backend | Node.js 20, Express 4 |
| Database | SQLite via better-sqlite3 |
| Cache | Redis via ioredis (optional) |
| Auth | JWT + bcrypt |
| Container | Docker, Docker Compose |
| Game data | [Speedrun.com public API v1](https://github.com/speedruncomorg/api) |

## 🚀 Quick Start

### Docker (recommended)

```bash
git clone https://github.com/pedrorivz/thegamerspath.git
cd thegamerspath

# Set a strong JWT secret
cp .env.example .env
nano .env  # edit JWT_SECRET

docker compose up -d
# Open http://localhost:3002
```

### Development

Requires **Node.js 20+**.

```bash
# Install all dependencies
npm install && cd server && npm install && cd ..

# Configure the backend (sets PORT=3002 to match the Vite proxy)
cp server/.env.example server/.env

# Start frontend (port 5174) + backend (port 3002) together
npm run dev:all
```

The Vite dev server proxies `/api/*` to Express automatically — no CORS config needed.

## ⚙️ Configuration

All settings via environment variables. Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port (set to `3002` in Docker and `server/.env.example`) |
| `JWT_SECRET` | — | **Required in production.** Sign JWT tokens. |
| `REDIS_URL` | *(unset)* | Redis URL. Cache is disabled if not set. |
| `DATA_DIR` | `./server/data` | Where SQLite database file is stored |
| `NODE_ENV` | `development` | Set to `production` to serve frontend + disable CORS |

## 🐳 Docker Image

```bash
docker pull ghcr.io/pedrorivz/thegamerspath:latest
```

Available tags: `latest`, `1.0.0`

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Get JWT token |
| `GET` | `/api/auth/me` | ✓ | Validate current token |
| `GET` | `/api/library` | ✓ | List all saved games |
| `POST` | `/api/library` | ✓ | Add a game |
| `DELETE` | `/api/library/:id` | ✓ | Remove a game |
| `PATCH` | `/api/library/:id/level` | ✓ | Toggle level completion |
| `GET` | `/api/games/search?q=` | — | Search games (Redis-cached 1h) |
| `GET` | `/api/games/:id` | — | Game detail (Redis-cached 24h) |
| `GET` | `/api/health` | — | Health check + Redis status |

## 🗂 Project Structure

```
thegamerspath/
├── src/                    # React frontend (Vite)
│   ├── api/                # HTTP client + Speedrun.com helpers
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Auth Zustand store
│   ├── pages/              # Route pages (lazy-loaded)
│   ├── store/              # Library Zustand store
│   └── types/              # Shared TypeScript interfaces
├── server/                 # Express backend
│   ├── routes/             # /auth, /library, /games
│   ├── middleware/         # JWT requireAuth guard
│   ├── db.ts               # SQLite + WAL + schema migrations
│   ├── auth.ts             # JWT sign/verify
│   └── server.ts           # Express app entry point
├── Dockerfile              # Multi-stage: frontend build → runtime
├── docker-compose.yml      # Services: web + redis + volumes
├── Makefile                # Shortcuts: make up, make dev-all, etc.
├── .env.example            # Docker Compose environment template
└── server/.env.example     # Local development environment template
```

## 🤝 Contributing

Contributions are very welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Quick version:
1. Fork → branch → change → PR
2. Run `npm run build` and `npx tsc --noEmit` before submitting
3. Keep PRs focused — one concern per PR

## 🗺 Roadmap

Open to contributions on any of these:

- [ ] Manual game entry (games not in Speedrun.com)
- [x] Manual level entry (games that levels not in Speedrun.com)
- [x] Notes / journal per game
- [x] Import/export library as JSON
- [ ] Backlog / wishlist list type
- [ ] Statistics page (completion rate, streaks)
- [ ] Dark / custom colors theme toggle
- [ ] Internationalization (i18n)

Have an idea? [Open a feature request](https://github.com/pedrorivz/thegamerspath/issues/new?template=feature_request.yml).

## 📄 License

[MIT](LICENSE) — free to use, fork, and self-host.
