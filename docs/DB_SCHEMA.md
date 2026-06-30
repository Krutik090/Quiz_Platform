# Data Model

## MongoDB collections

### `adminusers`
Admin/host accounts. `passwordHash` (Argon2id) and `mfaSecret` (TOTP) are `select: false` — never returned by default queries.

| Field | Type | Notes |
|---|---|---|
| email | string | unique, lowercase |
| name | string | |
| passwordHash | string | Argon2id, OWASP-recommended params (`memoryCost: 19456, timeCost: 2, parallelism: 1`) |
| role | enum | `super_admin \| admin \| moderator \| viewer` |
| isActive | boolean | |
| mfaEnabled | boolean | |
| mfaSecret | string? | TOTP secret, set once MFA enrollment completes |
| failedLoginAttempts | number | resets on success; ≥5 locks the account for 15 minutes |
| lockedUntil | Date? | |

### `quizzes`
| Field | Type | Notes |
|---|---|---|
| title, description, tags | | |
| ownerId | string | the creating admin's id |
| status | enum | `draft \| published \| archived` |
| questions | array | heterogeneous — stored as loosely-typed subdocuments (`strict: false`); Zod (`packages/shared/schemas/question.schema.ts`) is the actual shape authority, validated at the API boundary |
| settings | object | randomization, leaderboard duration, late-join policy, theme |

### `quizevents`
One per quiz **launch** — re-running a quiz creates a new event rather than mutating the last one, so historical results never collide.

| Field | Type | Notes |
|---|---|---|
| quizId, hostId | string | |
| joinCode | string | unique, 6 chars, ambiguity-free alphabet |
| status | enum | `lobby \| in_progress \| question_active \| question_review \| leaderboard \| ended \| aborted` |
| currentQuestionIndex | number | |
| questionOrder | string[] | post-randomization order, fixed at start |
| questionsSnapshot | array | full question objects (with answer keys) copied at start time — later edits to the source quiz never alter a past event |
| settingsSnapshot | object | same idea, for quiz settings |
| startedAt, endedAt | Date? | |

### `participants`
| Field | Type | Notes |
|---|---|---|
| eventId | string | |
| username, email, avatar | | unique on `(eventId, email)` — rejoining with the same email reuses the same participant |
| totalScore | number | authoritative final score (mirrors the live Redis leaderboard) |
| cumulativeResponseTimeMs | number | tie-break key — lower wins |
| isConnected | boolean | updated on socket connect/disconnect |

### `answerrecords`
Durable per-answer log analytics queries run against (Redis answer hashes expire after 6h; this collection doesn't).

| Field | Type |
|---|---|
| eventId, questionId, participantId | string |
| isCorrect | boolean |
| pointsAwarded | number |
| responseTimeMs | number |
| response | mixed |

### `auditlogs`
Append-only. `actorId`, `action` (e.g. `quiz.created`, `admin.login`, `event.created`), `targetType`, `targetId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.

## Redis key layout

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `refresh_token:{jti}` | string (userId) | refresh TTL | Active refresh-token allowlist; deleted on use (rotation) — absence on presentation signals replay. |
| `event:{eventId}:leaderboard` | sorted set | 12h | member = participantId, score = `totalScore * 1e7 - cumulativeResponseTimeMs` so `ZREVRANGE` alone yields the correctly tie-broken ranking. |
| `event:{eventId}:participant_meta:{participantId}` | hash | 12h | `{ username, avatar, totalScore, cumulativeResponseTimeMs }` for fast leaderboard rendering without a Mongo join. |
| `event:{eventId}:answers:{questionId}` | hash | 6h | participantId → `1` (slot reserved via `HSETNX`, blocks duplicate answers) then → JSON result once scored. |

`QuizEngine`'s actual timers and current-question state are **not** in Redis — they live in-process per server instance (see the scaling note in `docs/SOCKET_EVENTS.md`).
