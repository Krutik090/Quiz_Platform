# Socket.IO Event Catalogue

Single namespace (`/`), authenticated via the handshake — every connection must present
`{ auth: { token, role: "host" | "participant" } }`:

- `role: "participant"` — `token` is the short-lived join token returned by `POST /api/public/participants/join`. The server reads `participantId`/`eventId` from it; the socket auto-joins `event:{eventId}`.
- `role: "host"` — `token` is the admin's normal access token. The socket must explicitly request `host:join_control_room` for an event it owns (Moderator role or above) before receiving any event traffic.

There is no anonymous path into an event's room — `apps/server/src/sockets/socket-auth.middleware.ts` rejects any connection without a valid token.

## Client → Server

| Event | Role | Payload | Notes |
|---|---|---|---|
| `participant:submit_answer` | participant | `{ eventId, questionId, response }` | `response` shape depends on question type (see `answerResponseSchemas` in `packages/shared`). Rejected if the question isn't active, already answered, or the window has closed. Optional ack callback receives `{ received, isCorrect?, pointsAwarded? }`. |
| `host:join_control_room` | host | `{ eventId }` | Verifies the caller is the event's host before joining the room. |
| `host:start_event` | host | `{ eventId }` | Event must be in `lobby`. |
| `host:next_question` | host | `{ eventId }` | Manually ends the current question early, or skips the leaderboard pause. |
| `host:end_event` | host | `{ eventId }` | Force-ends the event. |
| `host:kick_participant` | host | `{ eventId, participantId }` | Disconnects that participant's socket and marks them disconnected. |

## Server → Client (broadcast to `event:{eventId}`)

| Event | Payload | When |
|---|---|---|
| `event:lobby_update` | `{ eventId, participants[], participantCount }` | A participant joins, disconnects, or reconnects while in the lobby. |
| `event:started` | `{ eventId }` | Host starts the event. |
| `event:question_started` | `EventStateSnapshot` (`currentQuestion`, `questionEndsAtMs`, `questionIndex`, `totalQuestions`) | A new question becomes active. `questionEndsAtMs` is the **only** source of truth for the countdown — clients must never run their own independent timer. |
| `event:question_ended` | `{ eventId, result: QuestionResult }` | Timer expires or host forces next. Includes answer distribution and average response time; correctness summary only (never per-participant data). |
| `event:leaderboard_update` | `Leaderboard` | After each question (if `showLeaderboardAfterEachQuestion`) and at event end. |
| `event:ended` | `{ eventId, finalLeaderboard }` | All questions exhausted or host force-ended. |
| `event:aborted` | `{ eventId, reason }` | Administrative abort. |
| `event:participant_kicked` | `{ participantId }` | Broadcast after a host kick. |

## Server → Client (direct)

| Event | Payload | Notes |
|---|---|---|
| `participant:answer_ack` | `{ questionId, received, isCorrect?, pointsAwarded? }` | Sent to the submitting participant only. |
| `error` | `{ code, message }` | Any rejected action (validation, permission, conflict). |

## Server-authoritative guarantees

- Timers live only in `QuizEngine` (`apps/server/src/sockets/quiz-engine/engine.service.ts`); the client only ever displays a countdown derived from `questionEndsAtMs`.
- Scoring (`scoring.ts`) runs entirely server-side against the full question (with answer keys) — participants only ever receive `toPublicQuestion()`-stripped payloads.
- Duplicate answers are rejected via an atomic Redis `HSETNX` reservation (`answer-store.ts`) before any scoring happens.
- `QuizEngine` runtime state is in-process per server instance — horizontally scaling the Socket.IO layer (the Redis adapter handles message fan-out) still requires pinning each event's *engine* to one instance, e.g. via sticky routing keyed by `eventId`, since timers themselves are not distributed.
