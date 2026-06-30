import type { EventStatus } from "../constants/event-status";
import type { PublicQuestion } from "./quiz.types";

/**
 * An Event is one play-through of a Quiz. Starting the same quiz twice creates two
 * Events, so historical results never overwrite each other.
 */
export interface QuizEvent {
  id: string;
  quizId: string;
  hostId: string;
  joinCode: string;
  status: EventStatus;
  currentQuestionIndex: number;
  /** Order in which questions are served this run (post-randomization, fixed at start). */
  questionOrder: string[];
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

/** Server-pushed state snapshot consumed by both Admin (read-only) and Participant clients. */
export interface EventStateSnapshot {
  eventId: string;
  status: EventStatus;
  participantCount: number;
  currentQuestion?: PublicQuestion;
  /** Authoritative server epoch ms when the current question's timer ends. */
  questionEndsAtMs?: number;
  questionIndex: number;
  totalQuestions: number;
}

export interface AnswerSubmission {
  eventId: string;
  questionId: string;
  participantId: string;
  /** Shape depends on question type — validated server-side against the question schema. */
  response: unknown;
  /** Server-recorded receipt time, never trusted from the client. */
  submittedAtMs: number;
}

export interface QuestionResult {
  questionId: string;
  correctAnswerSummary: unknown;
  answerDistribution: Record<string, number>;
  averageResponseTimeMs: number;
  totalResponses: number;
}
