/**
 * Canonical Socket.IO event names. Shared verbatim between server and client so
 * a typo can never silently desync a listener from an emitter.
 */
export const SocketEvent = {
  // Connection lifecycle
  CONNECT_ERROR: "connect_error",
  DISCONNECT: "disconnect",

  // Client -> Server (participant)
  JOIN_EVENT: "participant:join",
  LEAVE_EVENT: "participant:leave",
  SUBMIT_ANSWER: "participant:submit_answer",

  // Client -> Server (host/admin)
  HOST_START_EVENT: "host:start_event",
  HOST_NEXT_QUESTION: "host:next_question",
  HOST_END_EVENT: "host:end_event",
  HOST_KICK_PARTICIPANT: "host:kick_participant",
  HOST_JOIN_CONTROL_ROOM: "host:join_control_room",

  // Server -> Client (broadcast to event room)
  LOBBY_UPDATE: "event:lobby_update",
  EVENT_STARTED: "event:started",
  QUESTION_STARTED: "event:question_started",
  QUESTION_TIMER_TICK: "event:question_timer_tick",
  QUESTION_ENDED: "event:question_ended",
  LEADERBOARD_UPDATE: "event:leaderboard_update",
  EVENT_ENDED: "event:ended",
  EVENT_ABORTED: "event:aborted",
  PARTICIPANT_KICKED: "event:participant_kicked",

  // Server -> Client (direct/ack)
  ANSWER_ACK: "participant:answer_ack",
  ERROR: "error",
} as const;

export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];
