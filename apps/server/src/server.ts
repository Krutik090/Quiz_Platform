import http from "http";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { connectMongo, disconnectMongo } from "@/lib/mongo";
import { disconnectRedis } from "@/lib/redis";
import { createApp } from "@/app";
import { createSocketServer } from "@/sockets";

async function bootstrap() {
  await connectMongo();

  const app = createApp();
  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Tribastion server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectMongo();
      await disconnectRedis();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
