import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Participant } from "@tribastion/shared";

interface ParticipantSession {
  participant: Participant;
  token: string;
}

interface ParticipantSessionState {
  sessions: Record<string, ParticipantSession>;
  setSession: (eventId: string, session: ParticipantSession) => void;
  getSession: (eventId: string) => ParticipantSession | undefined;
  clearSession: (eventId: string) => void;
}

/** Keyed by eventId in sessionStorage so a page refresh during a live quiz doesn't lose the join token. */
export const useParticipantSessionStore = create<ParticipantSessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      setSession: (eventId, session) => set((s) => ({ sessions: { ...s.sessions, [eventId]: session } })),
      getSession: (eventId) => get().sessions[eventId],
      clearSession: (eventId) =>
        set((s) => {
          const next = { ...s.sessions };
          delete next[eventId];
          return { sessions: next };
        }),
    }),
    { name: "tribastion-participant-sessions", storage: { getItem: (k) => JSON.parse(sessionStorage.getItem(k) ?? "null"), setItem: (k, v) => sessionStorage.setItem(k, JSON.stringify(v)), removeItem: (k) => sessionStorage.removeItem(k) } },
  ),
);
