import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { Users, ShieldCheck } from "lucide-react";
import {
  EventStatus,
  SocketEvent,
  type EventStateSnapshot,
  type Leaderboard,
  type LobbyUpdatePayload,
  type EventEndedPayload,
  type AnswerAckPayload,
  type SocketErrorPayload,
} from "@tribastion/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createParticipantSocket } from "@/lib/socket-client";
import { useParticipantSessionStore } from "@/stores/participant-session.store";
import { QuestionTimer } from "@/components/shared/question-timer";
import { LeaderboardList } from "@/components/shared/leaderboard-list";
import { QuestionPlayer } from "@/features/participant/question-player";

export default function PlayPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const session = useParticipantSessionStore((s) => (eventId ? s.getSession(eventId) : undefined));
  const socketRef = useRef<Socket | null>(null);

  const [status, setStatus] = useState<EventStatus>(EventStatus.LOBBY);
  const [roster, setRoster] = useState<LobbyUpdatePayload | null>(null);
  const [snapshot, setSnapshot] = useState<EventStateSnapshot | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [lastAck, setLastAck] = useState<AnswerAckPayload & { isCorrect?: boolean; pointsAwarded?: number } | null>(null);
  const [ended, setEnded] = useState<EventEndedPayload | null>(null);

  useEffect(() => {
    if (!eventId) return;
    if (!session) {
      navigate("/join");
      return;
    }

    const socket = createParticipantSocket(session.token);
    socketRef.current = socket;

    socket.on(SocketEvent.LOBBY_UPDATE, (payload: LobbyUpdatePayload) => setRoster(payload));
    socket.on(SocketEvent.EVENT_STARTED, () => setStatus(EventStatus.IN_PROGRESS));
    socket.on(SocketEvent.QUESTION_STARTED, (payload: EventStateSnapshot) => {
      setSnapshot(payload);
      setStatus(EventStatus.QUESTION_ACTIVE);
      setLastAck(null);
    });
    socket.on(SocketEvent.LEADERBOARD_UPDATE, (payload: Leaderboard) => {
      setLeaderboard(payload);
      setStatus(EventStatus.LEADERBOARD);
    });
    socket.on(SocketEvent.ANSWER_ACK, (payload: AnswerAckPayload & { isCorrect?: boolean; pointsAwarded?: number }) => setLastAck(payload));
    socket.on(SocketEvent.EVENT_ENDED, (payload: EventEndedPayload) => {
      setEnded(payload);
      setStatus(EventStatus.ENDED);
    });
    socket.on(SocketEvent.PARTICIPANT_KICKED, () => {
      toast.error("You have been removed from this event");
      navigate("/join");
    });
    socket.on(SocketEvent.ERROR, (payload: SocketErrorPayload) => toast.error(payload.message));

    return () => {
      socket.disconnect();
    };
  }, [eventId, session, navigate]);

  function submitAnswer(response: unknown) {
    if (!snapshot?.currentQuestion || !eventId) return;
    socketRef.current?.emit(SocketEvent.SUBMIT_ANSWER, { eventId, questionId: snapshot.currentQuestion.id, response });
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck className="h-5 w-5 text-primary" /> Tribastion
        </span>
        <Badge>{session.participant.username}</Badge>
      </div>

      {status === EventStatus.LOBBY && (
        <Card className="animate-fade-in">
          <CardHeader className="items-center text-center">
            <Users className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Waiting for the host to start…</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-center text-sm text-muted-foreground">{roster?.participantCount ?? 1} participants joined</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {roster?.participants.map((p) => (
                <Badge key={p.id} variant="secondary">
                  {p.username}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {status === EventStatus.QUESTION_ACTIVE && snapshot?.currentQuestion && snapshot.questionEndsAtMs && (
        <Card className="animate-slide-up">
          <CardHeader>
            <p className="text-xs text-muted-foreground">
              Question {snapshot.questionIndex + 1} of {snapshot.totalQuestions}
            </p>
            <CardTitle className="text-xl">{snapshot.currentQuestion.prompt}</CardTitle>
            <QuestionTimer endsAtMs={snapshot.questionEndsAtMs} totalMs={snapshot.currentQuestion.timeLimitSeconds * 1000} />
          </CardHeader>
          <CardContent>
            <QuestionPlayer question={snapshot.currentQuestion} disabled={!!lastAck} onSubmit={submitAnswer} />
          </CardContent>
        </Card>
      )}

      {status === EventStatus.LEADERBOARD && leaderboard && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>
              {lastAck?.isCorrect ? "Correct! 🎉" : lastAck ? "Not quite — keep going" : "Leaderboard"}
              {lastAck?.pointsAwarded ? ` (+${lastAck.pointsAwarded} pts)` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardList leaderboard={leaderboard} highlightParticipantId={session.participant.id} />
          </CardContent>
        </Card>
      )}

      {status === EventStatus.ENDED && ended && (
        <Card className="animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle>Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardList leaderboard={ended.finalLeaderboard} highlightParticipantId={session.participant.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
