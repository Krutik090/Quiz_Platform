import type { Server } from "socket.io";
import {
  EventStatus,
  SocketEvent,
  type Question,
  type QuizSettings,
  type EventStateSnapshot,
  type QuestionResult,
  type EventEndedPayload,
} from "@tribastion/shared";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/app-error";
import { eventRepository } from "@/modules/event/event.repository";
import { participantRepository } from "@/modules/participant/participant.repository";
import { leaderboardService } from "@/modules/leaderboard/leaderboard.service";
import { answerStore } from "@/sockets/quiz-engine/answer-store";
import { scoreAnswer } from "@/sockets/quiz-engine/scoring";
import { toPublicQuestion } from "@/sockets/quiz-engine/question-utils";
import { answerResponseSchemas } from "@tribastion/shared";
import { AnswerRecordModel } from "@/modules/analytics/answer-record.model";

interface RuntimeEvent {
  eventId: string;
  hostId: string;
  questions: Question[];
  settings: QuizSettings;
  currentIndex: number;
  status: EventStatus;
  questionStartedAtMs: number;
  timer: NodeJS.Timeout | null;
}

function roomName(eventId: string) {
  return `event:${eventId}`;
}

/**
 * Single source of truth for event progression: timers, scoring, and state transitions
 * all live here, server-side only. Clients are pure renderers of broadcast state.
 *
 * Runtime state is kept in-process (one engine instance owns each event's timers). This
 * is the simplest correct design for a single-server deployment; horizontally scaling
 * the Socket.IO layer requires pinning each event's engine to one instance (e.g. sticky
 * routing keyed by eventId) since timers are not distributed.
 */
export class QuizEngine {
  private readonly runtime = new Map<string, RuntimeEvent>();

  constructor(private readonly io: Server) {}

  async startEvent(eventId: string, requesterId: string): Promise<void> {
    if (this.runtime.has(eventId)) throw AppError.conflict("Event has already started");

    const event = await eventRepository.findById(eventId);
    if (!event) throw AppError.notFound("Event not found");
    if (event.hostId !== requesterId) throw AppError.forbidden();
    if (event.status !== EventStatus.LOBBY) throw AppError.conflict("Event is not in the lobby state");

    const questions = event.questionOrder
      .map((id) => (event.questionsSnapshot as unknown as Question[]).find((q) => q.id === id))
      .filter((q): q is Question => Boolean(q));

    if (questions.length === 0) throw AppError.badRequest("Event has no questions to run");

    const runtimeEvent: RuntimeEvent = {
      eventId,
      hostId: event.hostId,
      questions,
      settings: event.settingsSnapshot as unknown as QuizSettings,
      currentIndex: -1,
      status: EventStatus.IN_PROGRESS,
      questionStartedAtMs: 0,
      timer: null,
    };
    this.runtime.set(eventId, runtimeEvent);

    await eventRepository.updateStatus(eventId, { status: EventStatus.IN_PROGRESS, startedAt: new Date() });
    this.io.to(roomName(eventId)).emit(SocketEvent.EVENT_STARTED, { eventId });

    await this.advance(eventId);
  }

  private async advance(eventId: string): Promise<void> {
    const rt = this.runtime.get(eventId);
    if (!rt) return;

    rt.currentIndex += 1;
    const question = rt.questions[rt.currentIndex];

    if (!question) {
      await this.endEvent(eventId);
      return;
    }

    rt.status = EventStatus.QUESTION_ACTIVE;
    rt.questionStartedAtMs = Date.now();

    await eventRepository.updateStatus(eventId, { status: EventStatus.QUESTION_ACTIVE, currentQuestionIndex: rt.currentIndex });

    const timerEnabled = question.timerEnabled !== false;
    const endsAtMs = timerEnabled ? rt.questionStartedAtMs + question.timeLimitSeconds * 1000 : undefined;

    const snapshot: EventStateSnapshot = {
      eventId,
      status: rt.status,
      participantCount: 0,
      currentQuestion: toPublicQuestion(question),
      questionEndsAtMs: endsAtMs,
      questionIndex: rt.currentIndex,
      totalQuestions: rt.questions.length,
    };
    this.io.to(roomName(eventId)).emit(SocketEvent.QUESTION_STARTED, snapshot);

    if (timerEnabled) {
      rt.timer = setTimeout(() => {
        this.endQuestion(eventId).catch((err) => logger.error({ err, eventId }, "Failed to end question on timer expiry"));
      }, question.timeLimitSeconds * 1000);
    }
    // timerEnabled === false: no automatic progression — host must call requestNextQuestion
  }

  private async endQuestion(eventId: string): Promise<void> {
    const rt = this.runtime.get(eventId);
    if (!rt || rt.status !== EventStatus.QUESTION_ACTIVE) return;

    if (rt.timer) clearTimeout(rt.timer);
    rt.timer = null;
    rt.status = EventStatus.QUESTION_REVIEW;

    const question = rt.questions[rt.currentIndex]!;
    const answers = await answerStore.getAll(eventId, question.id);

    const answerDistribution: Record<string, number> = {};
    let totalResponseTime = 0;
    for (const { response } of Object.values(answers)) {
      const key = JSON.stringify(response);
      answerDistribution[key] = (answerDistribution[key] ?? 0) + 1;
    }
    for (const { responseTimeMs } of Object.values(answers)) totalResponseTime += responseTimeMs;

    if (Object.keys(answers).length > 0) {
      await AnswerRecordModel.insertMany(
        Object.entries(answers).map(([participantId, a]) => ({
          eventId,
          questionId: question.id,
          participantId,
          isCorrect: a.isCorrect,
          pointsAwarded: a.pointsAwarded,
          responseTimeMs: a.responseTimeMs,
          response: a.response,
        })),
        { ordered: false },
      ).catch((err) => logger.error({ err, eventId, questionId: question.id }, "Failed to persist answer records"));
    }

    const result: QuestionResult = {
      questionId: question.id,
      correctAnswerSummary: this.summarizeCorrectAnswer(question),
      answerDistribution,
      averageResponseTimeMs: Object.keys(answers).length > 0 ? Math.round(totalResponseTime / Object.keys(answers).length) : 0,
      totalResponses: Object.keys(answers).length,
    };

    this.io.to(roomName(eventId)).emit(SocketEvent.QUESTION_ENDED, { eventId, result });

    const timerEnabled = question.timerEnabled !== false;

    if (!timerEnabled) {
      // Manual mode — stay in QUESTION_REVIEW and wait for the host to click Next.
      rt.status = EventStatus.QUESTION_REVIEW;
      await eventRepository.updateStatus(eventId, { status: EventStatus.QUESTION_REVIEW });
      return;
    }

    // Auto-timer mode — advance automatically after showing leaderboard (or immediately).
    if (rt.settings.showLeaderboardAfterEachQuestion) {
      rt.status = EventStatus.LEADERBOARD;
      await eventRepository.updateStatus(eventId, { status: EventStatus.LEADERBOARD });

      const leaderboard = await leaderboardService.getLeaderboard(eventId);
      this.io.to(roomName(eventId)).emit(SocketEvent.LEADERBOARD_UPDATE, leaderboard);

      rt.timer = setTimeout(() => {
        this.advance(eventId).catch((err) => logger.error({ err, eventId }, "Failed to advance after leaderboard"));
      }, rt.settings.leaderboardDurationSeconds * 1000);
    } else {
      await this.advance(eventId);
    }
  }

  private summarizeCorrectAnswer(question: Question): unknown {
    const q = question as unknown as Record<string, unknown>;
    if (Array.isArray(q.options)) return (q.options as { id: string; isCorrect?: boolean }[]).filter((o) => o.isCorrect).map((o) => o.id);
    if ("correctAnswer" in q) return q.correctAnswer;
    if ("correctValue" in q) return q.correctValue;
    if ("acceptedAnswers" in q) return q.acceptedAnswers;
    if (Array.isArray(q.items)) return [...(q.items as { id: string; correctPosition?: number }[])].sort((a, b) => (a.correctPosition ?? 0) - (b.correctPosition ?? 0)).map((i) => i.id);
    if (Array.isArray(q.pairs)) return q.pairs;
    if (Array.isArray(q.regions)) return (q.regions as { id: string; isCorrect?: boolean }[]).filter((r) => r.isCorrect).map((r) => r.id);
    return null;
  }

  async submitAnswer(eventId: string, participantId: string, questionId: string, rawResponse: unknown) {
    const rt = this.runtime.get(eventId);
    if (!rt || rt.status !== EventStatus.QUESTION_ACTIVE) {
      throw AppError.badRequest("This question is no longer accepting answers");
    }

    const question = rt.questions[rt.currentIndex];
    if (!question || question.id !== questionId) {
      throw AppError.badRequest("Answer does not match the active question");
    }

    const responseTimeMs = Date.now() - rt.questionStartedAtMs;
    const timerEnabled = question.timerEnabled !== false;
    if (timerEnabled && responseTimeMs > question.timeLimitSeconds * 1000 + 500) {
      throw AppError.badRequest("Answer window has closed");
    }

    const reserved = await answerStore.reserveSlot(eventId, questionId, participantId);
    if (!reserved) throw AppError.conflict("You have already answered this question");

    const schema = answerResponseSchemas[question.type];
    const parsed = schema.safeParse(rawResponse);
    if (!parsed.success) throw AppError.badRequest("Invalid answer format");

    const { isCorrect, pointsAwarded } = scoreAnswer(question, parsed.data, responseTimeMs);

    await answerStore.record(eventId, questionId, participantId, {
      isCorrect,
      pointsAwarded,
      responseTimeMs,
      response: parsed.data,
    });

    await participantRepository.incrementScore(participantId, pointsAwarded, responseTimeMs);
    await leaderboardService.applyScore(eventId, participantId, pointsAwarded, responseTimeMs);

    return { isCorrect, pointsAwarded };
  }

  private assertHost(eventId: string, hostId: string): RuntimeEvent {
    const rt = this.runtime.get(eventId);
    if (!rt) throw AppError.notFound("Event is not live");
    if (rt.hostId !== hostId) throw AppError.forbidden();
    return rt;
  }

  /**
   * HOST_NEXT_QUESTION drives every manual transition:
   *   QUESTION_ACTIVE  → endQuestion (scores, shows result)
   *   QUESTION_REVIEW  → show leaderboard (if enabled) OR advance to next question
   *   LEADERBOARD      → advance to next question
   * This is the sole control for timer-disabled (manual) questions.
   * For timer-enabled questions it also allows early skipping.
   */
  async requestNextQuestion(eventId: string, hostId: string): Promise<void> {
    const rt = this.assertHost(eventId, hostId);

    if (rt.status === EventStatus.QUESTION_ACTIVE) {
      await this.endQuestion(eventId);

    } else if (rt.status === EventStatus.QUESTION_REVIEW) {
      if (rt.settings.showLeaderboardAfterEachQuestion) {
        rt.status = EventStatus.LEADERBOARD;
        await eventRepository.updateStatus(eventId, { status: EventStatus.LEADERBOARD });
        const leaderboard = await leaderboardService.getLeaderboard(eventId);
        this.io.to(roomName(eventId)).emit(SocketEvent.LEADERBOARD_UPDATE, leaderboard);
      } else {
        await this.advance(eventId);
      }

    } else if (rt.status === EventStatus.LEADERBOARD) {
      if (rt.timer) clearTimeout(rt.timer);
      await this.advance(eventId);
    }
  }

  async requestEndEvent(eventId: string, hostId: string): Promise<void> {
    this.assertHost(eventId, hostId);
    await this.endEvent(eventId);
  }

  async endEvent(eventId: string): Promise<void> {
    const rt = this.runtime.get(eventId);
    if (rt?.timer) clearTimeout(rt.timer);

    await eventRepository.updateStatus(eventId, { status: EventStatus.ENDED, endedAt: new Date() });

    const finalLeaderboard = await leaderboardService.getLeaderboard(eventId);
    const payload: EventEndedPayload = { eventId, finalLeaderboard };
    this.io.to(roomName(eventId)).emit(SocketEvent.EVENT_ENDED, payload);

    this.runtime.delete(eventId);
  }

  async abortEvent(eventId: string, reason: string): Promise<void> {
    const rt = this.runtime.get(eventId);
    if (rt?.timer) clearTimeout(rt.timer);
    this.runtime.delete(eventId);

    await eventRepository.updateStatus(eventId, { status: EventStatus.ABORTED, endedAt: new Date() });
    this.io.to(roomName(eventId)).emit(SocketEvent.EVENT_ABORTED, { eventId, reason });
  }

  getSnapshot(eventId: string): EventStateSnapshot | null {
    const rt = this.runtime.get(eventId);
    if (!rt) return null;

    const question = rt.questions[rt.currentIndex];
    return {
      eventId,
      status: rt.status,
      participantCount: 0, // populated by caller from the lobby roster
      currentQuestion: question && rt.status === EventStatus.QUESTION_ACTIVE ? toPublicQuestion(question) : undefined,
      questionEndsAtMs: question && rt.status === EventStatus.QUESTION_ACTIVE ? rt.questionStartedAtMs + question.timeLimitSeconds * 1000 : undefined,
      questionIndex: rt.currentIndex,
      totalQuestions: rt.questions.length,
    };
  }

  isLive(eventId: string): boolean {
    return this.runtime.has(eventId);
  }
}
