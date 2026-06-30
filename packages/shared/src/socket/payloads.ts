import type { EventStateSnapshot, QuestionResult } from "../types/event.types";
import type { Leaderboard } from "../types/leaderboard.types";
import type { Participant } from "../types/participant.types";
import type { ErrorCode } from "../constants/error-codes";

/** Socket auth handshake payload — short-lived join token issued by REST join endpoint, or admin access token. */
export interface SocketAuthPayload {
  token: string;
}

export interface JoinEventPayload {
  eventId: string;
}

export interface SubmitAnswerPayload {
  eventId: string;
  questionId: string;
  response: unknown;
}

export interface HostStartEventPayload {
  eventId: string;
}

export interface HostNextQuestionPayload {
  eventId: string;
}

export interface HostKickPayload {
  eventId: string;
  participantId: string;
}

export interface LobbyUpdatePayload {
  eventId: string;
  participants: Pick<Participant, "id" | "username" | "avatar" | "isConnected">[];
  participantCount: number;
}

export interface QuestionTimerTickPayload {
  eventId: string;
  questionId: string;
  remainingMs: number;
}

export interface QuestionEndedPayload {
  eventId: string;
  result: QuestionResult;
}

export interface AnswerAckPayload {
  questionId: string;
  received: boolean;
}

export interface SocketErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface EventEndedPayload {
  eventId: string;
  finalLeaderboard: Leaderboard;
}

export type { EventStateSnapshot, Leaderboard };
