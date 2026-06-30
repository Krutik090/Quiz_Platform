# API Reference

Base URL: `/api`. All protected routes require `Authorization: Bearer <accessToken>`. Responses use `{ ...data }` on success and `{ error: { code, message, details? } }` on failure.

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | none | `{ email, password, mfaCode? }` → `{ user, accessToken, accessTokenExpiresAt }`. Sets refresh-token cookie. Returns `401 MFA_REQUIRED` if MFA is enabled and no code was sent. |
| POST | `/refresh` | refresh cookie + CSRF token | Rotates the refresh token, returns a new `accessToken`. |
| POST | `/logout` | refresh cookie + CSRF token | Revokes the current refresh token. |
| GET | `/me` | Bearer | Current admin user. |
| POST | `/register` | Bearer, Super Admin | Creates a new admin user. |
| POST | `/change-password` | Bearer | Rotates password, revokes all sessions. |
| POST | `/mfa/enroll/start` | Bearer | Returns a TOTP `secret` + `otpauthUrl` (render as a QR code). |
| POST | `/mfa/enroll/verify` | Bearer | `{ secret, code }` — confirms enrollment. |

`GET /api/csrf-token` (no auth) issues the CSRF cookie/token pair required by `/refresh` and `/logout`.

## Quizzes (`/api/quizzes`) — Bearer, Moderator+

| Method | Path | Description |
|---|---|---|
| POST | `/` | Create a quiz (draft). |
| GET | `/` | List quizzes owned by the caller (`?page&limit&status`). |
| GET | `/:id` | Get one quiz. |
| PATCH | `/:id` | Update title/description/tags/settings/status. |
| PUT | `/:id/questions` | Replace the full question list. |
| POST | `/:id/publish` | Mark a quiz published (requires ≥1 question). |
| DELETE | `/:id` | Admin+ only. |

## Events (`/api/events`) — Bearer, Moderator+

An **Event** is one live play-through of a quiz; starting the same quiz twice creates two events with independent results.

| Method | Path | Description |
|---|---|---|
| POST | `/` | `{ quizId }` → creates an event, snapshots the quiz's questions/settings, generates a join code. |
| GET | `/:id` | Get event details. |
| GET | `/:id/qr` | `{ qrCodeDataUrl, joinCode, joinUrl }`. |
| GET | `/by-quiz/:quizId` | All events ever run for a quiz. |

Public: `GET /api/public/events/by-code/:joinCode` → `{ id, status, allowLateJoin }`, used by the join page before a participant has registered.

## Participants

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/public/participants/join` | none (rate-limited) | `{ joinCode, username, email, avatar }` → `{ participant, token }`. `token` is a short-lived JWT used to authenticate the participant's Socket.IO connection. Rejects joins after start unless the quiz has `allowLateJoin`. |
| GET | `/api/participants/by-event/:eventId` | Bearer, Moderator+ | Roster for the host dashboard. |

## Analytics (`/api/analytics`) — Bearer, Viewer+

| Method | Path | Description |
|---|---|---|
| GET | `/events/:eventId` | Aggregated `EventAnalytics` (participation, per-question stats, final rankings). |
| GET | `/events/:eventId/export/:format` | `format` ∈ `csv \| xlsx \| pdf`. Streams a file download. |

## Media (`/api/media`) — Bearer, Moderator+

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | `multipart/form-data` field `file`. Allowlisted image/audio/video MIME types, max size from `MAX_UPLOAD_MB`. Returns `{ url, mimeType, sizeBytes }`. |

## Audit Logs (`/api/audit-logs`) — Bearer, Admin+

| Method | Path | Description |
|---|---|---|
| GET | `/` | `?page&limit&actorId&targetType&action` — paginated audit trail of admin actions. |
