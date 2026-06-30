import { QuizEventModel, type QuizEventDocument } from "@/modules/event/event.model";
import type { EventStatus } from "@tribastion/shared";

export const eventRepository = {
  create(data: {
    quizId: string;
    hostId: string;
    joinCode: string;
    questionOrder: string[];
    questionsSnapshot: Record<string, unknown>[];
    settingsSnapshot: Record<string, unknown>;
  }): Promise<QuizEventDocument> {
    return QuizEventModel.create(data);
  },

  findById(id: string): Promise<QuizEventDocument | null> {
    return QuizEventModel.findById(id).exec();
  },

  findByJoinCode(joinCode: string): Promise<QuizEventDocument | null> {
    return QuizEventModel.findOne({ joinCode: joinCode.toUpperCase() }).exec();
  },

  findByQuiz(quizId: string, hostId: string) {
    return QuizEventModel.find({ quizId, hostId }).sort({ createdAt: -1 }).exec();
  },

  async updateStatus(id: string, patch: Partial<{ status: EventStatus; currentQuestionIndex: number; startedAt: Date; endedAt: Date }>) {
    return QuizEventModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).exec();
  },
};
