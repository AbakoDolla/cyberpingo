# CyberPingo Architecture

## 1. Overview

CyberPingo is a gamified cybersecurity learning platform. The V1 architecture is
deliberately simple: one React client, one Express REST API, one PostgreSQL
database, inside a single pnpm monorepo.

```text
React + Vite (apps/web)
        |
        |  HTTPS / JSON  (REST, /api/v1)
        v
Express + TypeScript (apps/api)
        |
        v
     Prisma ORM
        |
        v
     PostgreSQL
```

The browser **never** talks to PostgreSQL. Every read and write goes through the
REST API, which owns validation, authorization and all business rules.

## 2. Monorepo layout

```text
cyberpingo/
├── apps/
│   ├── web/        React + Vite + TypeScript client
│   └── api/        Node.js + Express + TypeScript REST API
├── packages/
│   ├── types/      Domain types shared by web and api
│   └── config/     Shared TypeScript + Prettier configuration
├── docs/           Architecture, API contract, database, contributing, roadmap
├── .github/workflows/   Frontend and backend CI pipelines
└── docker-compose.yml   Local PostgreSQL
```

Workspaces are declared in `pnpm-workspace.yaml` (`apps/*`, `packages/*`).

## 3. Frontend architecture

```text
apps/web/src/
├── components/   ui (shadcn), layout, navbar, sidebar, dashboard, learning, ...
├── pages/        One folder per route-level screen
├── features/     Feature-scoped logic (auth, courses, lessons, ...)
├── services/     Axios client + one service per API resource
├── store/        Zustand stores (session + global preferences only)
├── hooks/        Reusable React hooks
├── routes/       AppRoutes.tsx and ProtectedRoute.tsx
├── lib/          Framework-agnostic helpers (cn)
├── types/        Re-export of @cyberpingo/types
└── utils/        Environment access and pure helpers
```

Key decisions:

- **Routing** uses React Router. The route map lives in `routes/AppRoutes.tsx`;
  authenticated screens are wrapped in `ProtectedRoute`.
- **HTTP** goes through the single Axios instance in `services/api.ts`, built
  from `VITE_API_URL`. Services never call `axios` directly.
- **State**: Zustand holds only session state and global preferences. Feature
  data is fetched on demand, not mirrored into a global store.
- **Forms**: React Hook Form + Zod resolvers. Client validation improves UX; it
  is never a security boundary.
- **Styling**: Tailwind CSS with CSS variables, plus shadcn/ui primitives in
  `components/ui`.

## 4. Backend architecture

```text
server.ts -> app.ts -> middlewares -> routes -> controllers -> services -> Prisma -> PostgreSQL
```

```text
apps/api/src/
├── config/       Validated environment (Zod) and constants
├── routes/       Version 1 router
├── modules/      Feature modules: auth, users, courses, lessons, challenges,
│                 progress, gamification, health
├── controllers/  Cross-module controllers (thin HTTP adapters)
├── services/     Cross-module business logic
├── middlewares/  error, not-found, rate limit, auth guard, Zod validation
├── validators/   Shared Zod schemas
├── lib/          Prisma client, logger
├── utils/        HttpError, password hashing, JWT helpers
└── types/        Express type augmentation
```

Each module owns `*.routes.ts`, `*.controller.ts`, `*.service.ts` and
`*.validators.ts`. Controllers stay thin; business rules live in services; only
services touch Prisma.

`app.ts` builds the Express application (helmet, CORS, JSON parsing, cookies,
request logging, rate limiting, `/api/v1` router, 404 handler, error handler).
`server.ts` only binds the port and handles graceful shutdown, which keeps the
app mountable from tests without opening a socket.

## 5. Communication contract

- Base URL: `/api/v1` (see `docs/API.md`).
- Requests and responses are JSON.
- Errors always use the same envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed" } }
```

- Shared response shapes are typed in `packages/types` and imported by both
  applications. Runtime validation remains a backend responsibility.

## 6. Authentication design

- Short-lived JWT **access token** returned in the response body and sent by the
  client as `Authorization: Bearer <token>`.
- Long-lived **refresh token** delivered as an `HttpOnly`, `SameSite`, and (in
  production) `Secure` cookie, so JavaScript cannot read it.
- Passwords are hashed with scrypt, a memory-hard KDF from the Node standard
  library (`src/utils/password.ts`). Plaintext passwords are never stored or
  logged.
- `requireAuth` verifies the access token and attaches the identity to the
  request; authorization rules stay in the services.

## 7. Gamification: the backend is the source of truth

The client can only declare _what happened_ (a lesson was completed, a challenge
was submitted). XP, levels, streaks and badges are computed server-side:

```text
POST /api/v1/lessons/:lessonId/complete
  -> validation -> progression rules -> XP calculation -> database -> response
```

A client can never claim an XP amount.

## 8. Future evolution

The same Express API is designed to serve additional clients without structural
change:

```text
apps/web  ─┐
apps/mobile ├── REST /api/v1 ──> Express ──> Prisma ──> PostgreSQL
apps/admin ─┘
```

No microservices, no event bus, no orchestration layer: the platform is built by
two developers and stays intentionally simple.
