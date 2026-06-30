import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { createRedisDuplicate } from "@/lib/redis";
import { socketAuthMiddleware } from "@/sockets/socket-auth.middleware";
import { registerParticipantHandlers } from "@/sockets/handlers/participant.handler";
import { registerHostHandlers } from "@/sockets/handlers/host.handler";
import { QuizEngine } from "@/sockets/quiz-engine/engine.service";

export function createSocketServer(httpServer: HttpServer): { io: Server; engine: QuizEngine } {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()), credentials: true },
    transports: ["websocket", "polling"],
  });

  const pubClient = createRedisDuplicate();
  const subClient = createRedisDuplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  const engine = new QuizEngine(io);

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id, data: socket.data }, "Socket connected");
    registerParticipantHandlers(io, engine, socket);
    registerHostHandlers(io, engine, socket);
  });

  return { io, engine };
}
