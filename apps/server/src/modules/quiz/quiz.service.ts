import { nanoid } from "nanoid";
import type { CreateQuizInput, UpdateQuizInput } from "@tribastion/shared";
import type { Question, Quiz, QuizStatus } from "@tribastion/shared";
import { quizRepository } from "@/modules/quiz/quiz.repository";
import { AppError } from "@/lib/app-error";
import { auditService } from "@/modules/audit/audit.service";
import type { QuizDocument } from "@/modules/quiz/quiz.model";

function toDto(doc: QuizDocument): Quiz {
  return {
    id: doc.id as string,
    title: doc.title,
    description: doc.description ?? undefined,
    ownerId: doc.ownerId,
    status: doc.status as QuizStatus,
    questions: doc.questions as unknown as Question[],
    settings: doc.settings as unknown as Quiz["settings"],
    tags: doc.tags,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const quizService = {
  async create(ownerId: string, input: CreateQuizInput): Promise<Quiz> {
    const doc = await quizRepository.create({ ...input, ownerId, tags: input.tags ?? [], settings: input.settings ?? {} });
    await auditService.log({ actorId: ownerId, action: "quiz.created", targetType: "Quiz", targetId: doc.id });
    return toDto(doc);
  },

  async getOwned(id: string, ownerId: string): Promise<Quiz> {
    const doc = await quizRepository.findById(id);
    if (!doc || doc.ownerId !== ownerId) throw AppError.notFound("Quiz not found");
    return toDto(doc);
  },

  async list(ownerId: string, page: number, limit: number, status?: QuizStatus) {
    const [items, total] = await quizRepository.findByOwner(ownerId, page, limit, status);
    return { items: items.map(toDto), total, page, limit };
  },

  async update(id: string, ownerId: string, input: UpdateQuizInput): Promise<Quiz> {
    const doc = await quizRepository.update(id, ownerId, input);
    if (!doc) throw AppError.notFound("Quiz not found");
    await auditService.log({ actorId: ownerId, action: "quiz.updated", targetType: "Quiz", targetId: id, metadata: input });
    return toDto(doc);
  },

  async replaceQuestions(id: string, ownerId: string, questions: Question[]): Promise<Quiz> {
    const withIds = questions.map((q) => ({ ...q, id: q.id || nanoid(10) }));
    const doc = await quizRepository.replaceQuestions(id, ownerId, withIds as Question[]);
    if (!doc) throw AppError.notFound("Quiz not found");
    await auditService.log({
      actorId: ownerId,
      action: "quiz.questions_updated",
      targetType: "Quiz",
      targetId: id,
      metadata: { questionCount: withIds.length },
    });
    return toDto(doc);
  },

  async publish(id: string, ownerId: string): Promise<Quiz> {
    const quiz = await this.getOwned(id, ownerId);
    if (quiz.questions.length === 0) throw AppError.badRequest("Cannot publish a quiz with no questions");
    return this.update(id, ownerId, { status: "published" as QuizStatus });
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const deleted = await quizRepository.delete(id, ownerId);
    if (!deleted) throw AppError.notFound("Quiz not found");
    await auditService.log({ actorId: ownerId, action: "quiz.deleted", targetType: "Quiz", targetId: id });
  },

  toDto,
};
