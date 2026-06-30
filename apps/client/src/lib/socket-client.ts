import { io, type Socket } from "socket.io-client";

export function createHostSocket(accessToken: string): Socket {
  return io("/", { path: "/socket.io", auth: { token: accessToken, role: "host" }, transports: ["websocket", "polling"] });
}

export function createParticipantSocket(joinToken: string): Socket {
  return io("/", { path: "/socket.io", auth: { token: joinToken, role: "participant" }, transports: ["websocket", "polling"] });
}
