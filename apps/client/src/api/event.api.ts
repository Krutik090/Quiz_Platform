import type { QuizEvent, Participant } from "@tribastion/shared";
import { apiClient } from "@/lib/api-client";

export const eventApi = {
  async create(quizId: string) {
    const { data } = await apiClient.post<{ event: QuizEvent }>("/events", { quizId });
    return data.event;
  },

  async get(id: string) {
    const { data } = await apiClient.get<{ event: QuizEvent }>(`/events/${id}`);
    return data.event;
  },

  async listForQuiz(quizId: string) {
    const { data } = await apiClient.get<{ events: QuizEvent[] }>(`/events/by-quiz/${quizId}`);
    return data.events;
  },

  async qrCode(id: string) {
    const { data } = await apiClient.get<{ qrCodeDataUrl: string; joinCode: string; joinUrl: string }>(`/events/${id}/qr`);
    return data;
  },

  async lookupByJoinCode(joinCode: string) {
    const { data } = await apiClient.get<{ id: string; status: string; allowLateJoin: boolean }>(
      `/public/events/by-code/${joinCode}`,
    );
    return data;
  },

  async participants(eventId: string) {
    const { data } = await apiClient.get<{ participants: Participant[] }>(`/participants/by-event/${eventId}`);
    return data.participants;
  },
};
