export interface QuestionAnalytics {
  questionId: string;
  prompt: string;
  totalResponses: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  averageResponseTimeMs: number;
  answerDistribution: Record<string, number>;
}

export interface ParticipationAnalytics {
  totalInvited: number;
  totalJoined: number;
  totalCompleted: number;
  dropOffByQuestionIndex: number[];
}

export interface EventAnalytics {
  eventId: string;
  quizId: string;
  quizTitle: string;
  participation: ParticipationAnalytics;
  questions: QuestionAnalytics[];
  finalRankings: { participantId: string; username: string; rank: number; score: number }[];
  startedAt?: string;
  endedAt?: string;
}

export const ExportFormat = {
  PDF: "pdf",
  CSV: "csv",
  XLSX: "xlsx",
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];
