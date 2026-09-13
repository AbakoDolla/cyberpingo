# CyberPingo

🐧 Gamified cybersecurity learning platform — Duolingo-style lessons with a modern cyber identity.

## About

CyberPingo makes cybersecurity learning accessible, progressive, interactive and
gamified. Learners move through short lessons, quizzes and hands-on challenges
while the platform tracks XP, levels, streaks and badges.

The repository is a **pnpm monorepo** containing two independent applications:
a React web client and an Express REST API. The browser never talks to the
database directly.

## Features

- Progressive courses and lessons (networking, Linux, security fundamentals, ...)
- Quizzes and guided, safe practice challenges
- Server-authoritative gamification: XP, levels, streaks, badges, leaderboard
- JWT authentication with refresh tokens
- Dark, modern, responsive interface

> Status: **V1 Foundation**. The structure, tooling, CI and data model are in
> place; feature milestones are described in [docs/ROADMAP.md](docs/ROADMAP.md).

## Tech Stack

| Layer    | Technologies                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Frontend | React, Vite, TypeScript, React Router, Tailwind CSS, shadcn/ui, Axios, Zustand, React Hook Form, Zod |
| Backend  | Node.js, Express, TypeScript, Prisma, JWT, Zod, Helmet, CORS, rate limiting                          |
| Database | PostgreSQL 16 (Docker)                                                                               |
| Tooling  | pnpm workspaces, ESLint, Prettier, TypeScript strict                                                 |
| Testing  | Vitest + React Testing Library (web), Jest + Supertest (api)                                         |
| CI       | GitHub Actions (frontend and backend pipelines)                                                      |

## Architecture

```text
React + Vite (apps/web)
        |
        |  REST /api/v1 (JSON)
        v
Express + TypeScript (apps/api)
        |
     Prisma ORM
        |
     PostgreSQL
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository Structure

```text
cyberpingo/
├── apps/
│   ├── web/                 React + Vite + TypeScript client
│   │   ├── public/
│   │   └── src/
│   │       ├── components/  ui (shadcn), layout, navbar, sidebar, ...
│   │       ├── pages/       Landing, Login, Register, Dashboard, Courses, ...
│   │       ├── features/    Feature-scoped logic
│   │       ├── services/    Axios client + API services
│   │       ├── store/       Zustand stores
│   │       ├── routes/      AppRoutes.tsx, ProtectedRoute.tsx
│   │       └── hooks/ lib/ types/ utils/ test/
│   └── api/                 Node.js + Express + TypeScript REST API
│       ├── prisma/          schema.prisma, migrations
│       ├── src/
│       │   ├── config/ routes/ modules/ controllers/ services/
│       │   ├── middlewares/ validators/ lib/ utils/ types/
│       │   └── app.ts, server.ts
│       └── tests/
├── packages/
│   ├── types/               Shared domain types
│   └── config/              Shared tsconfig + Prettier config
├── docs/                    ARCHITECTURE, API, DATABASE, CONTRIBUTING, ROADMAP
├── .github/workflows/       frontend.yml, backend.yml
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## Requirements

- Node.js >= 20
- pnpm >= 9 (`corepack enable`)
- Docker (local PostgreSQL)

## Installation

```bash
pnpm install

cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

docker compose up -d      # PostgreSQL on localhost:5432
pnpm db:generate          # Prisma client
pnpm db:migrate           # first migration
```

## Environment Variables

`apps/web/.env` (browser bundle — public values only):

```env
VITE_API_URL=http://localhost:3000/api/v1
```

`apps/api/.env` (server only — never commit real values):

```env
PORT=3000
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=http://localhost:5173
```

Secrets (database URL, JWT secrets, API keys) never belong to the frontend.

## Development

```bash
pnpm dev            # web (http://localhost:5173) + api (http://localhost:3000)
pnpm dev:web
pnpm dev:api

pnpm lint           # ESLint over the whole monorepo
pnpm format         # Prettier write
pnpm typecheck      # TypeScript, every workspace
pnpm build          # types -> api -> web

pnpm db:up          # docker compose up -d
pnpm db:down
pnpm db:studio
```

Health check once the API runs: `GET http://localhost:3000/api/v1/health`.

## Testing

```bash
pnpm test                              # all workspaces
pnpm --filter @cyberpingo/web test     # Vitest + React Testing Library
pnpm --filter @cyberpingo/api test     # Jest + Supertest
```

## Git Workflow

`main` (production-ready) and `develop` (integration). Work happens on
`feat/...`, `fix/...`, `docs/...` or `refactor/...` branches and is merged
through pull requests — never directly on `main`. See
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Roadmap

V1 Foundation → V1.1 Learning → V1.2 Gamification → V1.3 Challenges →
V2 Community → V2+ Advanced Labs. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Contributing

Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and keep
[docs/API.md](docs/API.md) up to date: it is the contract between the frontend
and backend developers.
