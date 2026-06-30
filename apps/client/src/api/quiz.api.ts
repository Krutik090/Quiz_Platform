import type { CreateQuizInput, Question, Quiz, UpdateQuizInput } from "@tribastion/shared";
import { apiClient } from "@/lib/api-client";

export const quizApi = {
  async list(page = 1, limit = 50) {
    const { data } = await apiClient.get<{ items: Quiz[]; total: number }>("/quizzes", { params: { page, limit } });
    return data;
  },

  async get(id: string) {
    const { data } = await apiClient.get<{ quiz: Quiz }>(`/quizzes/${id}`);
    return data.quiz;
  },

  async create(input: CreateQuizInput) {
    const { data } = await apiClient.post<{ quiz: Quiz }>("/quizzes", input);
    return data.quiz;
  },

  async update(id: string, input: UpdateQuizInput) {
    const { data } = await apiClient.patch<{ quiz: Quiz }>(`/quizzes/${id}`, input);
    return data.quiz;
  },

  async replaceQuestions(id: string, questions: Question[]) {
    const { data } = await apiClient.put<{ quiz: Quiz }>(`/quizzes/${id}/questions`, { questions });
    return data.quiz;
  },

  async publish(id: string) {
    const { data } = await apiClient.post<{ quiz: Quiz }>(`/quizzes/${id}/publish`);
    return data.quiz;
  },

  async remove(id: string) {
    await apiClient.delete(`/quizzes/${id}`);
  },
};
