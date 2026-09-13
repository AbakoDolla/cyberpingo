# CyberPingo API Contract

Base URL: `/api/v1` (default: `http://localhost:3000/api/v1`).

This document is the contract between the frontend and the backend developers.
It is updated **before** an endpoint is implemented.

## Conventions

- All requests and responses use JSON.
- Authenticated requests send `Authorization: Bearer <accessToken>`.
- The refresh token is carried by an `HttpOnly` cookie and is never present in a
  response body.
- `passwordHash` and any secret are never returned.
- Timestamps are ISO-8601 strings.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

| Status | Code                    | Meaning                                 |
| ------ | ----------------------- | --------------------------------------- |
| 400    | `BAD_REQUEST`           | Malformed request                       |
| 400    | `VALIDATION_ERROR`      | Zod validation failed (`details` given) |
| 401    | `UNAUTHORIZED`          | Missing, invalid or expired token       |
| 403    | `FORBIDDEN`             | Authenticated but not allowed           |
| 404    | `NOT_FOUND`             | Unknown route or resource               |
| 409    | `CONFLICT`              | Unique constraint (email, username)     |
| 429    | `TOO_MANY_REQUESTS`     | Rate limit exceeded                     |
| 500    | `INTERNAL_SERVER_ERROR` | Unexpected failure                      |

---

## Implemented

### GET /api/v1/health

| Field          | Value  |
| -------------- | ------ |
| Authentication | Public |
| Parameters     | None   |

Response `200`:

```json
{
  "status": "ok",
  "service": "cyberpingo-api",
  "version": "0.1.0",
  "uptime": 42,
  "timestamp": "2026-01-01T10:00:00.000Z"
}
```

---

## Planned (V1)

The endpoints below are the agreed contract. They are **not implemented yet**;
each one ships with its feature milestone (see `ROADMAP.md`).

### Authentication

#### POST /api/v1/auth/register

| Field          | Value  |
| -------------- | ------ |
| Authentication | Public |

Request:

```json
{ "username": "pingo", "email": "user@example.com", "password": "password" }
```

Response `201`:

```json
{
  "user": {
    "id": "user-id",
    "username": "pingo",
    "email": "user@example.com",
    "avatar": null,
    "xp": 0,
    "level": 1,
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-01T10:00:00.000Z"
  },
  "accessToken": "jwt",
  "expiresIn": 900
}
```

Errors: `400 VALIDATION_ERROR`, `409 CONFLICT` (email or username taken).

#### POST /api/v1/auth/login

| Field          | Value  |
| -------------- | ------ |
| Authentication | Public |

Request:

```json
{ "email": "user@example.com", "password": "password" }
```

Response `200`: same shape as register. A refresh-token cookie is set.

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` (generic message: the API
never reveals whether the email exists).

#### POST /api/v1/auth/refresh

| Field          | Value                   |
| -------------- | ----------------------- |
| Authentication | Refresh cookie          |
| Response       | New `accessToken` + TTL |
| Errors         | `401 UNAUTHORIZED`      |

#### POST /api/v1/auth/logout

| Field          | Value                    |
| -------------- | ------------------------ |
| Authentication | Refresh cookie           |
| Response       | `204` and cleared cookie |

#### GET /api/v1/auth/me

| Field          | Value        |
| -------------- | ------------ |
| Authentication | Bearer token |
| Response       | `PublicUser` |
| Errors         | `401`        |

### Users

#### GET /api/v1/users/me

Authenticated. Returns the `PublicUser` profile of the caller.

### Courses

#### GET /api/v1/courses

Public. Optional query: `page`, `pageSize`, `difficulty`.
Returns a paginated list of published courses.

#### GET /api/v1/courses/:courseId

Public. Returns one course and its ordered lessons. `404 NOT_FOUND` otherwise.

### Lessons

#### GET /api/v1/lessons/:lessonId

Public for published content. Returns the lesson and its quiz **without**
`correctIndex`.

#### POST /api/v1/lessons/:lessonId/complete

Authenticated. Body may contain quiz answers. The **backend** decides the XP
awarded; the client never sends an XP value.

Response `200`:

```json
{ "xp": 120, "level": 2, "completedLessons": 5, "completedCourses": 0, "currentStreak": 3 }
```

### Challenges

#### GET /api/v1/challenges/:challengeId

Public for published content. Never returns `solutionHash`.

#### POST /api/v1/challenges/:challengeId/submit

Authenticated. Request: `{ "answer": "flag{...}" }`.
Response `200`: a `ChallengeSubmission` with `status` and the XP awarded by the
backend. Submissions are rate limited.

### Progress and gamification

#### GET /api/v1/progress/me

Authenticated. Returns the `ProgressSummary` of the caller.

#### GET /api/v1/leaderboard

Public. Returns the XP ranking (`LeaderboardEntry[]`).

#### GET /api/v1/badges

Public. Returns the badge catalogue.
