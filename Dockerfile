# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Install backend production deps ─────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /server

COPY server/package.json server/package-lock.json ./
# Install all deps including devDeps (tsx is a devDep used at runtime)
RUN npm ci

# ─── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache tini wget

# Backend deps
COPY --from=backend-builder /server/node_modules ./server/node_modules

# Frontend build output
COPY --from=frontend-builder /app/dist ./dist

# Backend source
COPY server/package.json       ./server/package.json
COPY server/tsconfig.json      ./server/tsconfig.json
COPY server/server.ts          ./server/server.ts
COPY server/db.ts              ./server/db.ts
COPY server/auth.ts            ./server/auth.ts
COPY server/types.ts           ./server/types.ts
COPY server/ollama.ts          ./server/ollama.ts
COPY server/middleware         ./server/middleware
COPY server/routes             ./server/routes

WORKDIR /app/server

RUN mkdir -p data

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002
ENV DATA_DIR=/app/server/data

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node_modules/.bin/tsx", "server.ts"]
