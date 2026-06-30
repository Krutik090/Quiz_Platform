import { redis } from "@/lib/redis";
import type { Leaderboard, LeaderboardEntry } from "@tribastion/shared";

/**
 * Combines score and response-time into one sortable Redis ZSET score so ranking is a
 * single ZREVRANGE call: ties on totalScore are broken by *lower* cumulative response
 * time. The 10,000,000 ms (~2.7h) ceiling on cumulative time comfortably exceeds any
 * realistic quiz session length.
 */
const TIME_CEILING_MS = 10_000_000;

function combinedScore(totalScore: number, cumulativeResponseTimeMs: number): number {
  return totalScore * TIME_CEILING_MS - Math.min(cumulativeResponseTimeMs, TIME_CEILING_MS - 1);
}

function leaderboardKey(eventId: string) {
  return `event:${eventId}:leaderboard`;
}
function metaKey(eventId: string, participantId: string) {
  return `event:${eventId}:participant_meta:${participantId}`;
}

export const leaderboardService = {
  async registerParticipant(eventId: string, participant: { id: string; username: string; avatar: string }) {
    const multi = redis.multi();
    multi.zadd(leaderboardKey(eventId), 0, participant.id);
    multi.hset(metaKey(eventId, participant.id), {
      username: participant.username,
      avatar: participant.avatar,
      totalScore: 0,
      cumulativeResponseTimeMs: 0,
    });
    multi.expire(leaderboardKey(eventId), 60 * 60 * 12);
    multi.expire(metaKey(eventId, participant.id), 60 * 60 * 12);
    await multi.exec();
  },

  async applyScore(eventId: string, participantId: string, pointsAwarded: number, responseTimeMs: number) {
    const meta = await redis.hmget(metaKey(eventId, participantId), "totalScore", "cumulativeResponseTimeMs");
    const newTotalScore = Number(meta[0] ?? 0) + pointsAwarded;
    const newCumulativeTime = Number(meta[1] ?? 0) + responseTimeMs;

    const multi = redis.multi();
    multi.hset(metaKey(eventId, participantId), {
      totalScore: newTotalScore,
      cumulativeResponseTimeMs: newCumulativeTime,
    });
    multi.zadd(leaderboardKey(eventId), combinedScore(newTotalScore, newCumulativeTime), participantId);
    await multi.exec();

    return { totalScore: newTotalScore, cumulativeResponseTimeMs: newCumulativeTime };
  },

  async getLeaderboard(eventId: string, limit = 100): Promise<Leaderboard> {
    const participantIds = await redis.zrevrange(leaderboardKey(eventId), 0, limit - 1);
    if (participantIds.length === 0) {
      return { eventId, entries: [], generatedAtMs: Date.now() };
    }

    const pipeline = redis.pipeline();
    for (const id of participantIds) pipeline.hgetall(metaKey(eventId, id));
    const results = await pipeline.exec();

    const entries: LeaderboardEntry[] = participantIds.map((participantId, index) => {
      const meta = (results?.[index]?.[1] ?? {}) as Record<string, string>;
      return {
        rank: index + 1,
        participantId,
        username: meta.username ?? "Unknown",
        avatar: meta.avatar ?? "fox",
        score: Number(meta.totalScore ?? 0),
        cumulativeResponseTimeMs: Number(meta.cumulativeResponseTimeMs ?? 0),
      };
    });

    return { eventId, entries, generatedAtMs: Date.now() };
  },

  async clearEvent(eventId: string) {
    const pattern = `event:${eventId}:*`;
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];
    for await (const batch of stream) keys.push(...(batch as string[]));
    if (keys.length > 0) await redis.del(...keys);
  },
};
