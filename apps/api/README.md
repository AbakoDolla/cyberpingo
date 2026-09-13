# CyberPingo API

Node.js + Express + TypeScript + Prisma + PostgreSQL REST API.

## Requirements

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16 (`docker compose up -d` from the repository root)

## Setup

```bash
cp .env.example .env          # then fill in DATABASE_URL and JWT secrets
pnpm install                  # run from the repository root
pnpm db:generate              # prisma generate
pnpm db:migrate               # create/apply the local migration
pnpm dev                      # http://localhost:3000/api/v1
```

## Scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Start the API with hot reload (`tsx`)    |
| `pnpm build`       | Compile TypeScript to `dist/`            |
| `pnpm start`       | Run the compiled server                  |
| `pnpm typecheck`   | `tsc --noEmit`                           |
| `pnpm test`        | Jest + Supertest                         |
| `pnpm lint`        | ESLint                                   |
| `pnpm db:generate` | Regenerate the Prisma client             |
| `pnpm db:migrate`  | Create and apply a development migration |
| `pnpm db:studio`   | Open Prisma Studio                       |

## Layering

```
server.ts -> app.ts -> middlewares -> routes -> controllers -> services -> Prisma -> PostgreSQL
```

Controllers only adapt HTTP to the service layer; business logic belongs to
services. See `../../docs/ARCHITECTURE.md` and `../../docs/API.md`.

## Security notes

- Secrets are read from `.env` only and are never logged or returned.
- Passwords are hashed with scrypt (`src/utils/password.ts`); plaintext is never stored.
- `helmet`, `cors`, and `express-rate-limit` are enabled globally.
- Every error passes through `src/middlewares/error.middleware.ts`.
