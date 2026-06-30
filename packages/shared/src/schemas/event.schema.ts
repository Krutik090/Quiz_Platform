import { z } from "zod";

export const startEventSchema = z.object({
  quizId: z.string().min(1).max(64),
});

export const submitAnswerSchema = z.object({
  eventId: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  response: z.unknown(),
  /** Client-observed submit time, advisory only — server's receipt timestamp is authoritative. */
  clientTimestampMs: z.number().int().optional(),
});

export type StartEventInput = z.infer<typeof startEventSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
