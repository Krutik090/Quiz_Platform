import type { Server, Socket } from "socket.io";
import { SocketEvent, type SubmitAnswerPayload } from "@tribastion/shared";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/app-error";
import { participantRepository } from "@/modules/participant/participant.repository";
import { participantService } from "@/modules/participant/participant.service";
import type { QuizEngine } from "@/sockets/quiz-engine/engine.service";
import type { SocketData } from "@/sockets/socket-auth.middleware";

function roomName(eventId: string) {
  return `event:${eventId}`;
}

async function broadcastLobby(io: Server, eventId: string) {
  const participants = await participantService.listForEvent(eventId);
  io.to(roomName(eventId)).emit(SocketEvent.LOBBY_UPDATE, {
    eventId,
    participants: participants.map((p) => ({ id: p.id, username: p.username, avatar: p.avatar, isConnected: p.isConnected })),
    participantCount: participants.length,
  });
}

export function registerParticipantHandlers(io: Server, engine: QuizEngine, socket: Socket): void {
  const data = socket.data as SocketData;
  if (data.kind !== "participant" || !data.participantId || !data.eventId) return;

  const { participantId, eventId } = data;

  void (async () => {
    await participantRepository.setConnected(participantId, true);
    await socket.join(roomName(eventId));
    await broadcastLobby(io, eventId);

    const snapshot = engine.getSnapshot(eventId);
    if (snapshot) socket.emit(SocketEvent.QUESTION_STARTED, snapshot);
  })().catch((err) => logger.error({ err, participantId, eventId }, "Failed to initialize participant socket"));

  socket.on(SocketEvent.SUBMIT_ANSWER, (payload: SubmitAnswerPayload, ack?: (response: unknown) => void) => {
    void (async () => {
      try {
        const result = await engine.submitAnswer(eventId, participantId, payload.questionId, payload.response);
        const response = { questionId: payload.questionId, received: true, ...result };
        socket.emit(SocketEvent.ANSWER_ACK, response);
        ack?.(response);
      } catch (err) {
        const message = err instanceof AppError ? err.message : "Failed to submit answer";
        const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
        socket.emit(SocketEvent.ERROR, { code, message });
        ack?.({ received: false, message });
      }
    })();
  });

  socket.on(SocketEvent.DISCONNECT, () => {
    void (async () => {
      await participantRepository.setConnected(participantId, false);
      await broadcastLobby(io, eventId);
    })().catch((err) => logger.error({ err, participantId, eventId }, "Failed to handle participant disconnect"));
  });
}
