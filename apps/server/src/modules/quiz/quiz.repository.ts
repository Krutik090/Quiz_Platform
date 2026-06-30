import { QuizModel, type QuizDocument } from "@/modules/quiz/quiz.model";
import type { Question, QuizStatus } from "@tribastion/shared";

export const quizRepository = {
  create(data: { title: string; description?: string; ownerId: string; tags: string[]; settings: Record<string, unknown> }): Promise<QuizDocument> {
    return QuizModel.create(data);
  },

  findById(id: string): Promise<QuizDocument | null> {
    return QuizModel.findById(id).exec();
  },

  findByOwner(ownerId: string, page: number, limit: number, status?: QuizStatus) {
    const query: Record<string, unknown> = { ownerId };
    if (status) query.status = status;
    return Promise.all([
      QuizModel.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      QuizModel.countDocuments(query).exec(),
    ]);
  },

  async update(id: string, ownerId: string, patch: Record<string, unknown>): Promise<QuizDocument | null> {
    return QuizModel.findOneAndUpdate({ _id: id, ownerId }, { $set: patch }, { new: true, runValidators: true }).exec();
  },

  async replaceQuestions(id: string, ownerId: string, questions: Question[]): Promise<QuizDocument | null> {
    return QuizModel.findOneAndUpdate({ _id: id, ownerId }, { $set: { questions } }, { new: true, runValidators: true }).exec();
  },

  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await QuizModel.deleteOne({ _id: id, ownerId }).exec();
    return result.deletedCount > 0;
  },
};
