import type { EventAnalytics, ParticipationAnalytics, Question, QuestionAnalytics } from "@tribastion/shared";
import { eventRepository } from "@/modules/event/event.repository";
import { quizRepository } from "@/modules/quiz/quiz.repository";
import { participantRepository } from "@/modules/participant/participant.repository";
import { AnswerRecordModel } from "@/modules/analytics/answer-record.model";
import { AppError } from "@/lib/app-error";

export const analyticsService = {
  async getEventAnalytics(eventId: string, hostId: string): Promise<EventAnalytics> {
    const event = await eventRepository.findById(eventId);
    if (!event || event.hostId !== hostId) throw AppError.notFound("Event not found");

    const quiz = await quizRepository.findById(event.quizId);
    const questions = event.questionsSnapshot as unknown as Question[];
    const participants = await participantRepository.findByEvent(eventId);

    const records = await AnswerRecordModel.find({ eventId }).lean().exec();
    const recordsByQuestion = new Map<string, typeof records>();
    for (const r of records) {
      const list = recordsByQuestion.get(r.questionId) ?? [];
      list.push(r);
      recordsByQuestion.set(r.questionId, list);
    }

    const questionAnalytics: QuestionAnalytics[] = questions.map((q) => {
      const qRecords = recordsByQuestion.get(q.id) ?? [];
      const correctCount = qRecords.filter((r) => r.isCorrect).length;
      const distribution: Record<string, number> = {};
      for (const r of qRecords) {
        const key = JSON.stringify(r.response);
        distribution[key] = (distribution[key] ?? 0) + 1;
      }
      const totalTime = qRecords.reduce((sum, r) => sum + r.responseTimeMs, 0);

      return {
        questionId: q.id,
        prompt: q.prompt,
        totalResponses: qRecords.length,
        correctCount,
        incorrectCount: qRecords.length - correctCount,
        skippedCount: Math.max(participants.length - qRecords.length, 0),
        averageResponseTimeMs: qRecords.length > 0 ? Math.round(totalTime / qRecords.length) : 0,
        answerDistribution: distribution,
      };
    });

    const dropOffByQuestionIndex = questions.map((q) => recordsByQuestion.get(q.id)?.length ?? 0);

    const lastQuestion = questions[questions.length - 1];
    const completedParticipantIds = new Set((lastQuestion ? recordsByQuestion.get(lastQuestion.id) : undefined)?.map((r) => r.participantId) ?? []);

    const participation: ParticipationAnalytics = {
      totalInvited: participants.length,
      totalJoined: participants.length,
      totalCompleted: completedParticipantIds.size,
      dropOffByQuestionIndex,
    };

    const ranked = [...participants].sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.cumulativeResponseTimeMs - b.cumulativeResponseTimeMs;
    });

    return {
      eventId,
      quizId: event.quizId,
      quizTitle: quiz?.title ?? "Untitled Quiz",
      participation,
      questions: questionAnalytics,
      finalRankings: ranked.map((p, i) => ({ participantId: p.id, username: p.username, rank: i + 1, score: p.totalScore })),
      startedAt: event.startedAt?.toISOString(),
      endedAt: event.endedAt?.toISOString(),
    };
  },
};
