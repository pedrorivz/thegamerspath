# Contributing to The Gamer's Path

Thank you for taking the time to contribute! This document covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Commit Style](#commit-style)
- [A Note on AI-Assisted Development](#a-note-on-ai-assisted-development)

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## How to Contribute

### Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser, OS, and whether you're using Docker or dev mode

### Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Check [open issues](https://github.com/pedrorivz/thegamerspath/issues) first to avoid duplicates.

### Picking Up an Issue

Issues tagged [`good first issue`](https://github.com/pedrorivz/thegamerspath/issues?q=label%3A%22good+first+issue%22) are good starting points. Comment on the issue before starting so no one duplicates effort.

---

## Development Setup

### Prerequisites

- **Node.js 20+** (`node --version`)
- **npm 10+** (`npm --version`)
- **Docker + Docker Compose** (for integration testing)

### Installation

```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/thegamerspath.git
cd thegamerspath

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Copy environment file
cp .env.example .env
# .env defaults work for local development — no changes needed
```

### Running in Development

```bash
# Start both servers concurrently (recommended)
npm run dev:all

# Or separately:
npm run dev          # Frontend → http://localhost:5174
npm run dev:server   # Backend  → http://localhost:3002
```

The frontend Vite dev server proxies all `/api/*` requests to the Express backend. Hot reload works for both.

### Type Checking

```bash
# Frontend TypeScript check
npx tsc --noEmit

# Backend TypeScript check (from server/)
cd server && npx tsc --noEmit
```

### Production Build

```bash
npm run build
```

### Docker

```bash
make build   # Build the Docker image
make up      # Start production stack (web + redis)
make logs    # Tail logs
make down    # Stop everything
make clean   # Stop + remove volumes (deletes database)
```

---

## Project Architecture

### Frontend (`src/`)

```
src/
├── api/
│   ├── client.ts       # All HTTP calls to the backend (auth, library, games)
│   └── speedrun.ts     # Helpers to extract data from Speedrun.com API shape
├── components/         # Reusable UI (GameCard, LevelTracker, Navigation, ...)
├── hooks/
│   └── useAuth.ts      # Zustand store for JWT auth state
├── pages/              # Route-level components — lazy-loaded via React.lazy()
├── store/
│   └── library.ts      # Zustand store for game library — syncs with backend
└── types/
    └── speedrun.ts     # TypeScript interfaces for API and local state
```

**Key patterns:**
- Pages are lazy-loaded chunks (`React.lazy` + `Suspense`)
- All backend calls go through `src/api/client.ts` — never fetch directly in components
- Zustand stores are the single source of truth; components read from them via selectors
- Optimistic updates: UI updates immediately, rolled back on error

### Backend (`server/`)

```
server/
├── routes/
│   ├── auth.ts         # POST /register, POST /login, GET /me
│   ├── library.ts      # GET/POST /library, DELETE /:id, PATCH /:id/level
│   └── games.ts        # GET /search, GET /:id — proxies Speedrun.com with Redis cache
├── middleware/
│   └── auth.ts         # requireAuth: extracts + verifies JWT from Bearer header
├── db.ts               # SQLite connection, WAL mode, schema migrations (auto-run on start)
├── auth.ts             # signToken / verifyToken (jsonwebtoken)
├── types.ts            # TypeScript interfaces for DB rows and request bodies
└── server.ts           # Express app setup, serves frontend in production
```

**Key patterns:**
- SQLite uses WAL journal mode and foreign keys — always access via prepared statements
- Redis cache is optional — the app degrades gracefully if Redis is unavailable
- All DB mutations that span multiple tables use `db.transaction()`
- In production, Express serves the Vite `dist/` build (no separate web server needed)

---

## Submitting a Pull Request

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/the-bug
   ```

2. **Make your changes.** Keep the scope focused — one PR, one concern.

3. **Verify before pushing:**
   ```bash
   npx tsc --noEmit          # no TypeScript errors
   npm run build             # production build succeeds
   ```

4. **Push and open a PR** against `main`. Fill in the PR template.

5. **Be responsive** to review feedback — PRs with no activity for 30 days may be closed.

### PR Checklist

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Production build passes (`npm run build`)
- [ ] No unused imports or variables
- [ ] New UI components follow the existing dark theme (slate/violet palette)
- [ ] API changes are reflected in `README.md` API reference table
- [ ] Commit messages follow the style below

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add game notes per level
fix: level toggle rollback on network error
docs: add API reference to README
chore: update framer-motion to 12.x
refactor: extract toast helpers into shared module
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## A Note on AI-Assisted Development

This project was built with significant assistance from [Claude Code](https://claude.ai/code) (Anthropic's AI coding tool). We believe in being transparent about this.

**What this means for contributors:**
- The architecture, feature decisions, and code review are human-driven
- All code — AI-generated or otherwise — is held to the same standards: it must be readable, typed, and maintainable
- If you find something confusing, unclear, or poorly structured, that's a valid bug — open an issue or a PR

We use AI tools because they accelerate development, not to avoid understanding the codebase. Contributors are expected and encouraged to question, refactor, and improve any part of the code.
