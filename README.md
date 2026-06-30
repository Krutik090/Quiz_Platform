# Tribastion Quiz Platform

A production-grade, real-time quiz platform (Slido/Kahoot-style) built on the MERN stack with TypeScript. Includes a secure Admin Portal for building and running quizzes, and a Participant Portal for joining and playing them live.

## Stack

- **Client**: React 19, Vite, TypeScript, Tailwind CSS, shadcn-style components (Radix primitives), Zustand, TanStack Query, Socket.IO client, @dnd-kit, Recharts
- **Server**: Node.js, Express, TypeScript, Socket.IO, Mongoose (MongoDB), ioredis (Redis)
- **Auth**: JWT access tokens (in-memory on the client) + HTTP-only refresh cookies, Argon2id password hashing, TOTP-based MFA, RBAC
- **Infra**: Docker, Nginx

## Monorepo layout

```
apps/
  server/    Express + Socket.IO API
  client/    React admin + participant SPA
packages/
  shared/    Shared TypeScript types, Zod schemas, Socket.IO event contracts
docs/        API spec, Socket.IO event catalogue, DB schema notes
nginx/       Nginx config used by the client's Docker image
```

## Architecture at a glance

- **Server-authoritative quiz engine** (`apps/server/src/sockets/quiz-engine`): all timers, scoring, and state transitions run on the server. Clients are pure renderers of broadcast state — they never decide when a question ends or what the score is.
- **Redis** backs live session state: per-event leaderboard (sorted sets), duplicate-answer prevention (atomic `HSETNX`), and the Socket.IO Redis adapter for horizontal scaling of socket connections.
- **MongoDB** is the system of record: quizzes, events (one per quiz launch — so re-running a quiz never overwrites prior results), participants, and a durable `AnswerRecord` log analytics queries run against.
- **Repository pattern**: each domain module (`auth`, `quiz`, `event`, `participant`, `audit`) has a thin repository wrapping Mongoose, and a service layer that owns business rules.
- **Zod everywhere**: the same schemas in `packages/shared` validate API request bodies and participant answer payloads server-side, and double as the client's input types.

## Local development

Prerequisites: Node.js 20+, MongoDB, Redis (or use `docker compose up mongo redis`).

```bash
npm install
cp apps/server/.env.example apps/server/.env   # fill in real secrets
npm run build:shared
npm run dev   # runs server (:4000) and client (:5173) concurrently
```

The client dev server proxies `/api` and `/socket.io` to `localhost:4000` (see `apps/client/vite.config.ts`).

### Generating secrets

```bash
openssl rand -base64 48   # run 4x for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SOCKET_JOIN_TOKEN_SECRET, COOKIE_SECRET
```

### Creating the first Super Admin

There's no public registration endpoint by design (`POST /api/auth/register` requires an authenticated Super Admin). Seed the first account directly:

```js
// mongosh tribastion
db.adminusers.insertOne({
  email: "admin@example.com",
  name: "Super Admin",
  role: "super_admin",
  isActive: true,
  mfaEnabled: false,
  failedLoginAttempts: 0,
  // argon2id hash of your chosen password — generate via the server's argon2 package, e.g.:
  // node -e "require('argon2').hash('YourPassword123!').then(console.log)"
  passwordHash: "<paste argon2id hash here>",
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

## Docker

```bash
cp apps/server/.env.example apps/server/.env   # fill in real secrets
docker compose up --build
```

This starts MongoDB, Redis, the API server, an Nginx container serving the built client and reverse-proxying `/api`, `/uploads`, `/socket.io`, and `/health` to the server, and a Caddy container that terminates TLS and automatically provisions a Let's Encrypt certificate for the domain configured in `Caddyfile`. `NODE_ENV=production` makes cookies `Secure`, which requires HTTPS — that's what Caddy is for. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full step-by-step VPS walkthrough.

## Docs

- [`docs/API.md`](docs/API.md) — REST endpoint reference
- [`docs/SOCKET_EVENTS.md`](docs/SOCKET_EVENTS.md) — Socket.IO event catalogue
- [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md) — MongoDB collections and Redis key layout
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step VPS deployment with Docker + Caddy (automatic HTTPS)

## Security notes

- Refresh tokens are rotated on every use and tracked in Redis; reuse of a consumed token revokes all sessions for that user (replay detection).
- CSRF double-submit protection is applied only to the cookie-authenticated `/api/auth/refresh` and `/api/auth/logout` routes — the rest of the protected API requires an explicit `Authorization: Bearer` header, which a cross-site request cannot forge.
- Uploaded file names are server-generated (never the client-supplied name) and MIME-type allowlisted to prevent path traversal and extension spoofing.
- All question correctness data (`isCorrect`, `correctAnswer`, etc.) is stripped server-side (`toPublicQuestion`) before any payload reaches a participant socket.
