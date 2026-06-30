import type { Socket } from "socket.io";
import { verifyAccessToken, verifySocketJoinToken } from "@/lib/jwt";
import type { Role } from "@tribastion/shared";

export interface SocketData {
  kind: "participant" | "host";
  participantId?: string;
  eventId?: string;
  userId?: string;
  role?: Role;
}

/**
 * Every socket connection must present a token before it can join any room — there is
 * no anonymous or unauthenticated path into an event's real-time channel.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const { token, role } = socket.handshake.auth as { token?: string; role?: "host" | "participant" };

  if (!token || !role) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    if (role === "host") {
      const payload = verifyAccessToken(token);
      const data: SocketData = { kind: "host", userId: payload.sub, role: payload.role };
      socket.data = data;
    } else {
      const payload = verifySocketJoinToken(token);
      const data: SocketData = { kind: "participant", participantId: payload.sub, eventId: payload.eventId };
      socket.data = data;
    }
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
