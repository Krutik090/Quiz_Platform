import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
redis.on("connect", () => logger.info("Redis connected"));

/** Separate connections required by the Socket.IO Redis adapter (pub/sub can't share a connection with commands). */
export function createRedisDuplicate(): Redis {
  return redis.duplicate();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
