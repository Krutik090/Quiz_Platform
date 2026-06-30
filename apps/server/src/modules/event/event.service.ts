import QRCode from "qrcode";
import { EventStatus, type Question, type QuizEvent } from "@tribastion/shared";
import { eventRepository } from "@/modules/event/event.repository";
import { quizRepository } from "@/modules/quiz/quiz.repository";
import { generateJoinCode } from "@/lib/join-code";
import { AppError } from "@/lib/app-error";
import { auditService } from "@/modules/audit/audit.service";
import { env } from "@/config/env";
import type { QuizEventDocument } from "@/modules/event/event.model";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function toDto(doc: QuizEventDocument): QuizEvent {
  return {
    id: doc.id as string,
    quizId: doc.quizId,
    hostId: doc.hostId,
    joinCode: doc.joinCode,
    status: doc.status,
    currentQuestionIndex: doc.currentQuestionIndex,
    questionOrder: doc.questionOrder,
    startedAt: doc.startedAt?.toISOString(),
    endedAt: doc.endedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export const eventService = {
  /** Every quiz launch creates a brand-new Event so historical results from prior runs are never overwritten. */
  async createFromQuiz(quizId: string, hostId: string): Promise<QuizEvent> {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz || quiz.ownerId !== hostId) throw AppError.notFound("Quiz not found");
    if (quiz.questions.length === 0) throw AppError.badRequest("Quiz has no questions");

    const settings = quiz.settings as unknown as { randomizeQuestions: boolean };
    const orderedQuestions = settings.randomizeQuestions
      ? shuffle(quiz.questions as unknown as Question[])
      : (quiz.questions as unknown as Question[]);

    let joinCode = generateJoinCode();
    // Vanishingly unlikely to collide, but guarantee uniqueness rather than rely on probability alone.
    while (await eventRepository.findByJoinCode(joinCode)) {
      joinCode = generateJoinCode();
    }

    const doc = await eventRepository.create({
      quizId,
      hostId,
      joinCode,
      questionOrder: orderedQuestions.map((q) => q.id),
      questionsSnapshot: orderedQuestions as unknown as Record<string, unknown>[],
      settingsSnapshot: quiz.settings as unknown as Record<string, unknown>,
    });

    await auditService.log({ actorId: hostId, action: "event.created", targetType: "QuizEvent", targetId: doc.id, metadata: { quizId, joinCode } });

    return toDto(doc);
  },

  async getOwned(id: string, hostId: string): Promise<QuizEvent> {
    const doc = await eventRepository.findById(id);
    if (!doc || doc.hostId !== hostId) throw AppError.notFound("Event not found");
    return toDto(doc);
  },

  async getByJoinCode(joinCode: string): Promise<{ id: string; status: EventStatus; allowLateJoin: boolean }> {
    const doc = await eventRepository.findByJoinCode(joinCode);
    if (!doc) throw AppError.notFound("Invalid join code");
    const settings = doc.settingsSnapshot as unknown as { allowLateJoin?: boolean } | undefined;
    return { id: doc.id as string, status: doc.status, allowLateJoin: settings?.allowLateJoin ?? false };
  },

  async listForQuiz(quizId: string, hostId: string): Promise<QuizEvent[]> {
    const docs = await eventRepository.findByQuiz(quizId, hostId);
    return docs.filter((d) => d.hostId === hostId).map(toDto);
  },

  async getJoinQrCode(joinCode: string): Promise<string> {
    const joinUrl = `${env.CLIENT_URL}/join/${joinCode}`;
    return QRCode.toDataURL(joinUrl, { margin: 1, width: 320 });
  },
};
