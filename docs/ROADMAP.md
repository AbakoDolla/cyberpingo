# CyberPingo Roadmap

## V1 — Foundation (current)

- pnpm monorepo: `apps/web`, `apps/api`, `packages/types`, `packages/config`
- React + Vite + TypeScript client with React Router, Tailwind, shadcn/ui,
  Axios, Zustand, React Hook Form and Zod
- Express + TypeScript API with security middlewares, validated environment and
  a versioned `/api/v1` router
- Prisma schema for the V1 domain and PostgreSQL via Docker Compose
- ESLint, Prettier, TypeScript strict
- Vitest + React Testing Library, Jest + Supertest
- GitHub Actions pipelines for frontend and backend
- Documentation: architecture, API contract, database, contributing, roadmap

## V1.1 — Learning

- Authentication: register, login, refresh, logout, current user
- Course catalogue and course detail
- Lesson reader and quiz flow
- Lesson completion endpoint and progression tracking

## V1.2 — Gamification

- XP calculation rules owned by the backend
- Levels and level-up feedback
- Badges and `UserBadge` attribution
- Streaks
- Leaderboard

## V1.3 — Challenges

- Challenge catalogue by category
- Submission and server-side verification
- Hints and guided solutions
- Challenge history per user

## V2 — Community

- Public profiles
- Discussions around lessons and challenges
- Learning groups
- Notifications

## V2+ — Advanced labs

- Isolated, controlled practice environments
- Blue-team scenarios (log analysis, SIEM, threat detection)
- Admin panel (`apps/admin`)
- Mobile client (`apps/mobile`)

Offensive exercises always run in isolated sandboxes. CyberPingo never ships a
feature that enables attacks against real third-party systems.
