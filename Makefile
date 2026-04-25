.PHONY: dev dev-server dev-all build up down logs restart clean

# ── Development ───────────────────────────────────────────────────────────────

dev:
	npm run dev

dev-server:
	cd server && npm run dev

dev-all:
	npm run dev:all

# ── Production (Docker) ───────────────────────────────────────────────────────

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart web

# ── Utilities ─────────────────────────────────────────────────────────────────

clean:
	docker compose down -v
	rm -f server/data/tgp.db
