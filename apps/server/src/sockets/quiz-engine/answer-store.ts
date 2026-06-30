import { redis } from "@/lib/redis";

function answersKey(eventId: string, questionId: string) {
  return `event:${eventId}:answers:${questionId}`;
}

export const answerStore = {
  /** Atomically reserves the participant's single answer slot for this question — true if this is the first submission. */
  async reserveSlot(eventId: string, questionId: string, participantId: string): Promise<boolean> {
    const result = await redis.hsetnx(answersKey(eventId, questionId), participantId, "1");
    await redis.expire(answersKey(eventId, questionId), 60 * 60 * 6);
    return result === 1;
  },

  async record(
    eventId: string,
    questionId: string,
    participantId: string,
    data: { isCorrect: boolean; pointsAwarded: number; responseTimeMs: number; response: unknown },
  ) {
    await redis.hset(answersKey(eventId, questionId), participantId, JSON.stringify(data));
  },

  async getAll(eventId: string, questionId: string): Promise<Record<string, { isCorrect: boolean; pointsAwarded: number; responseTimeMs: number; response: unknown }>> {
    const raw = await redis.hgetall(answersKey(eventId, questionId));
    const out: Record<string, { isCorrect: boolean; pointsAwarded: number; responseTimeMs: number; response: unknown }> = {};
    for (const [participantId, value] of Object.entries(raw)) {
      if (value === "1") continue; // slot reserved but never finalized (e.g. validation failed mid-flight)
      out[participantId] = JSON.parse(value);
    }
    return out;
  },

  async count(eventId: string, questionId: string): Promise<number> {
    return redis.hlen(answersKey(eventId, questionId));
  },
};
