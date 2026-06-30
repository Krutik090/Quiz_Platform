import type { Server, Socket } from "socket.io";
import {
  SocketEvent,
  roleAtLeast,
  Role,
  type HostStartEventPayload,
  type HostNextQuestionPayload,
  type HostKickPayload,
} from "@tribastion/shared";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/app-error";
import { eventRepository } from "@/modules/event/event.repository";
import { participantRepository } from "@/modules/participant/participant.repository";
import { participantService } from "@/modules/participant/participant.service";
import type { QuizEngine } from "@/sockets/quiz-engine/engine.service";
import type { SocketData } from "@/sockets/socket-auth.middleware";

function roomName(eventId: string) {
  return `event:${eventId}`;
}

function handleError(socket: Socket, err: unknown) {
  const message = err instanceof AppError ? err.message : "An unexpected error occurred";
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  socket.emit(SocketEvent.ERROR, { code, message });
}

export function registerHostHandlers(io: Server, engine: QuizEngine, socket: Socket): void {
  const data = socket.data as SocketData;
  if (data.kind !== "host" || !data.userId || !data.role) return;

  const hostId = data.userId;

  if (!roleAtLeast(data.role, Role.MODERATOR)) {
    socket.emit(SocketEvent.ERROR, { code: "FORBIDDEN", message: "Insufficient permissions for live event control" });
    socket.disconnect(true);
    return;
  }

  socket.on(SocketEvent.HOST_JOIN_CONTROL_ROOM, (payload: { eventId: string }) => {
    void (async () => {
      const event = await eventRepository.findById(payload.eventId);
      if (!event || event.hostId !== hostId) throw AppError.forbidden();
      await socket.join(roomName(payload.eventId));

      const participants = await participantService.listForEvent(payload.eventId);
      socket.emit(SocketEvent.LOBBY_UPDATE, {
        eventId: payload.eventId,
        participants: participants.map((p) => ({ id: p.id, username: p.username, avatar: p.avatar, isConnected: p.isConnected })),
        participantCount: participants.length,
      });

      const snapshot = engine.getSnapshot(payload.eventId);
      if (snapshot) socket.emit(SocketEvent.QUESTION_STARTED, snapshot);
    })().catch((err) => handleError(socket, err));
  });

  socket.on(SocketEvent.HOST_START_EVENT, (payload: HostStartEventPayload) => {
    void engine.startEvent(payload.eventId, hostId).catch((err) => handleError(socket, err));
  });

  socket.on(SocketEvent.HOST_NEXT_QUESTION, (payload: HostNextQuestionPayload) => {
    void engine.requestNextQuestion(payload.eventId, hostId).catch((err) => handleError(socket, err));
  });

  socket.on(SocketEvent.HOST_END_EVENT, (payload: { eventId: string }) => {
    void engine.requestEndEvent(payload.eventId, hostId).catch((err) => handleError(socket, err));
  });

  socket.on(SocketEvent.HOST_KICK_PARTICIPANT, (payload: HostKickPayload) => {
    void (async () => {
      const event = await eventRepository.findById(payload.eventId);
      if (!event || event.hostId !== hostId) throw AppError.forbidden();

      await participantRepository.setConnected(payload.participantId, false);

      const sockets = await io.in(roomName(payload.eventId)).fetchSockets();
      for (const s of sockets) {
        if ((s.data as SocketData).participantId === payload.participantId) {
          s.emit(SocketEvent.PARTICIPANT_KICKED, { participantId: payload.participantId });
          s.disconnect(true);
        }
      }

      io.to(roomName(payload.eventId)).emit(SocketEvent.PARTICIPANT_KICKED, { participantId: payload.participantId });
    })().catch((err) => {
      logger.error({ err }, "Failed to kick participant");
      handleError(socket, err);
    });
  });
}
