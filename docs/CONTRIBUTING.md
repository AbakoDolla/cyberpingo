# Contributing to CyberPingo

## 1. Requirements

- Node.js >= 20
- pnpm >= 9 (`corepack enable`)
- Docker (for the local PostgreSQL instance)

## 2. Installation

```bash
git clone https://github.com/AbakoDolla/cyberpingo.git
cd cyberpingo
pnpm install

cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

docker compose up -d
pnpm db:generate
pnpm db:migrate
```

Start both applications:

```bash
pnpm dev          # web on :5173, api on :3000
pnpm dev:web
pnpm dev:api
```

## 3. Git workflow

Long-lived branches:

```text
main      production-ready
develop   integration branch
```

Never commit directly to `main`. Feature branches are created from `develop`:

```text
feat/frontend-auth        feat/backend-auth
feat/frontend-dashboard   feat/backend-courses
feat/frontend-learning    feat/backend-progress
fix/...                   docs/...      refactor/...
```

## 4. Commits

Conventional Commits:

```text
feat(web): add lesson progress bar
fix(api): reject expired refresh tokens
docs(api): document the challenge submission contract
refactor(web): extract the course card component
test(api): cover the password hashing helper
chore(repo): bump ESLint to v9
```

Keep commits focused and never commit a `.env` file or any secret.

## 5. Pull requests

Before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

A PR should:

1. Target `develop` (or `main` for a release).
2. Describe what changed and why.
3. Stay scoped to one feature or fix.
4. Update `docs/API.md` when the API contract changes.
5. Pass the frontend and backend GitHub Actions pipelines.

## 6. Code conventions

- TypeScript strict everywhere; avoid `any`.
- ESLint and Prettier decide formatting (`pnpm format`).
- Frontend: small components, one responsibility, Tailwind for styling,
  shadcn/ui primitives in `components/ui`.
- Backend: controllers stay thin, business logic lives in services, only
  services touch Prisma.
- Validate every external input with Zod on the backend.
- Never log passwords, tokens or secrets.

## 7. Responsibilities

| Developer 1 (Frontend)                       | Developer 2 (Backend)                     |
| -------------------------------------------- | ----------------------------------------- |
| React, Vite, TypeScript, routing, components | Express, TypeScript, Prisma, PostgreSQL   |
| UI/UX, dashboard, courses, lessons, quiz UI  | Auth, users, courses, lessons, challenges |
| Challenges UI, profile, gamification UI      | Progress, XP, badges, leaderboard         |
| API integration, responsive design           | REST API design and backend security      |

Both developers synchronise through `docs/API.md`.
