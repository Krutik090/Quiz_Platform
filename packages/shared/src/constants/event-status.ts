/**
 * Lifecycle of a live Event (a single play-through instance of a Quiz).
 * Strictly server-driven — clients never set this directly.
 */
export const EventStatus = {
  LOBBY: "lobby",
  IN_PROGRESS: "in_progress",
  QUESTION_ACTIVE: "question_active",
  QUESTION_REVIEW: "question_review",
  LEADERBOARD: "leaderboard",
  ENDED: "ended",
  ABORTED: "aborted",
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
