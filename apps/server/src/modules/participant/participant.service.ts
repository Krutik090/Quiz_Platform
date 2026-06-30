import { EventStatus, type JoinEventInput, type Participant } from "@tribastion/shared";
import { eventRepository } from "@/modules/event/event.repository";
import { participantRepository } from "@/modules/participant/participant.repository";
import { leaderboardService } from "@/modules/leaderboard/leaderboard.service";
import { signSocketJoinToken } from "@/lib/jwt";
import { AppError } from "@/lib/app-error";
import type { ParticipantDocument } from "@/modules/participant/participant.model";

const LATE_JOINABLE_STATUSES: ReadonlySet<EventStatus> = new Set([
  EventStatus.IN_PROGRESS,
  EventStatus.QUESTION_ACTIVE,
  EventStatus.QUESTION_REVIEW,
  EventStatus.LEADERBOARD,
]);

function toDto(doc: ParticipantDocument): Participant {
  return {
    id: doc.id as string,
    eventId: doc.eventId,
    username: doc.username,
    email: doc.email,
    avatar: doc.avatar as Participant["avatar"],
    joinedAt: doc.joinedAt.toISOString(),
    isConnected: doc.isConnected,
    totalScore: doc.totalScore,
    cumulativeResponseTimeMs: doc.cumulativeResponseTimeMs,
  };
}

export const participantService = {
  async join(input: JoinEventInput): Promise<{ participant: Participant; token: string }> {
    const event = await eventRepository.findByJoinCode(input.joinCode);
    if (!event) throw AppError.notFound("Invalid join code");

    const existing = await participantRepository.findByEventAndEmail(event.id, input.email);

    if (!existing) {
      const allowLateJoin = Boolean((event.settingsSnapshot as { allowLateJoin?: boolean })?.allowLateJoin);
      const joinable =
        event.status === EventStatus.LOBBY || (allowLateJoin && LATE_JOINABLE_STATUSES.has(event.status));
      if (!joinable) {
        throw AppError.badRequest(
          event.status === EventStatus.ENDED || event.status === EventStatus.ABORTED
            ? "This event has already ended"
            : "This quiz has already started and late joining is disabled",
        );
      }
    }

    const doc =
      existing ??
      (await participantRepository.create({
        eventId: event.id,
        username: input.username,
        email: input.email,
        avatar: input.avatar,
      }));

    if (!existing) {
      await leaderboardService.registerParticipant(event.id, { id: doc.id, username: doc.username, avatar: doc.avatar });
    }

    const token = signSocketJoinToken({ sub: doc.id, eventId: event.id });
    return { participant: toDto(doc), token };
  },

  async listForEvent(eventId: string): Promise<Participant[]> {
    const docs = await participantRepository.findByEvent(eventId);
    return docs.map(toDto);
  },

  toDto,
};
