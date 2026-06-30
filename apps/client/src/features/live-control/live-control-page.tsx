import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { ArrowLeft, Play, SkipForward, Square, Users } from "lucide-react";
import {
  SocketEvent,
  type EventStateSnapshot,
  type Leaderboard,
  type LobbyUpdatePayload,
  type QuestionEndedPayload,
  type EventEndedPayload,
  type SocketErrorPayload,
} from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventApi } from "@/api/event.api";
import { useAuthStore } from "@/stores/auth.store";
import { createHostSocket } from "@/lib/socket-client";
import { QuestionTimer } from "@/components/shared/question-timer";
import { LeaderboardList } from "@/components/shared/leaderboard-list";

export default function LiveControlPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  const { data: event } = useQuery({ queryKey: ["event", eventId], queryFn: () => eventApi.get(eventId!), enabled: !!eventId });
  const { data: qr } = useQuery({ queryKey: ["event-qr", eventId], queryFn: () => eventApi.qrCode(eventId!), enabled: !!eventId });

  const [roster, setRoster] = useState<LobbyUpdatePayload | null>(null);
  const [snapshot, setSnapshot] = useState<EventStateSnapshot | null>(null);
  const [lastResult, setLastResult] = useState<QuestionEndedPayload["result"] | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [ended, setEnded] = useState<EventEndedPayload | null>(null);

  useEffect(() => {
    if (!accessToken || !eventId) return;
    const socket = createHostSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => socket.emit(SocketEvent.HOST_JOIN_CONTROL_ROOM, { eventId }));
    socket.on(SocketEvent.LOBBY_UPDATE, (payload: LobbyUpdatePayload) => setRoster(payload));
    socket.on(SocketEvent.EVENT_STARTED, () => toast.success("Event started"));
    socket.on(SocketEvent.QUESTION_STARTED, (payload: EventStateSnapshot) => {
      setSnapshot(payload);
      setLastResult(null);
    });
    socket.on(SocketEvent.QUESTION_ENDED, (payload: QuestionEndedPayload) => setLastResult(payload.result));
    socket.on(SocketEvent.LEADERBOARD_UPDATE, (payload: Leaderboard) => setLeaderboard(payload));
    socket.on(SocketEvent.EVENT_ENDED, (payload: EventEndedPayload) => {
      setEnded(payload);
      setSnapshot(null);
    });
    socket.on(SocketEvent.ERROR, (payload: SocketErrorPayload) => toast.error(payload.message));

    return () => {
      socket.disconnect();
    };
  }, [accessToken, eventId]);

  function startEvent() {
    socketRef.current?.emit(SocketEvent.HOST_START_EVENT, { eventId });
  }
  function nextQuestion() {
    socketRef.current?.emit(SocketEvent.HOST_NEXT_QUESTION, { eventId });
  }
  function endEvent() {
    socketRef.current?.emit(SocketEvent.HOST_END_EVENT, { eventId });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Live Control</h1>
        {event && <Badge>{event.status}</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Join code: {qr?.joinCode}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {qr && <img src={qr.qrCodeDataUrl} alt="Join QR code" className="mx-auto w-40 rounded-lg" />}
            <p className="text-center text-sm text-muted-foreground">{roster?.participantCount ?? 0} joined</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {roster?.participants.map((p) => (
                <Badge key={p.id} variant={p.isConnected ? "default" : "outline"}>
                  {p.username}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Question Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot?.currentQuestion && snapshot.questionEndsAtMs ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Question {snapshot.questionIndex + 1} of {snapshot.totalQuestions}
                </p>
                <p className="text-lg font-semibold">{snapshot.currentQuestion.prompt}</p>
                <QuestionTimer endsAtMs={snapshot.questionEndsAtMs} />
              </div>
            ) : (
              <p className="text-muted-foreground">No question is currently active</p>
            )}

            {lastResult && (
              <div className="rounded-md border border-border p-3 text-sm">
                <p>
                  {lastResult.totalResponses} responses · avg {Math.round(lastResult.averageResponseTimeMs / 100) / 10}s
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={startEvent} disabled={!!ended || !!snapshot}>
                <Play className="h-4 w-4" /> Start
              </Button>
              <Button variant="outline" onClick={nextQuestion} disabled={!!ended}>
                <SkipForward className="h-4 w-4" /> Skip / Next
              </Button>
              <Button variant="destructive" onClick={endEvent} disabled={!!ended}>
                <Square className="h-4 w-4" /> End Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {leaderboard && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList leaderboard={leaderboard} />
            </CardContent>
          </Card>
        )}

        {ended && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Event Ended</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeaderboardList leaderboard={ended.finalLeaderboard} />
              <Button onClick={() => navigate(`/admin/events/${eventId}/analytics`)}>View Analytics</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
