import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Play, Square, Trophy, Users } from "lucide-react";
import {
  EventStatus,
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

  useQuery({ queryKey: ["event", eventId], queryFn: () => eventApi.get(eventId!), enabled: !!eventId });
  const { data: qr } = useQuery({ queryKey: ["event-qr", eventId], queryFn: () => eventApi.qrCode(eventId!), enabled: !!eventId });

  const [liveStatus, setLiveStatus] = useState<EventStatus>(EventStatus.LOBBY);
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
    socket.on(SocketEvent.EVENT_STARTED, () => {
      setLiveStatus(EventStatus.IN_PROGRESS);
      toast.success("Event started — waiting for first question");
    });
    socket.on(SocketEvent.QUESTION_STARTED, (payload: EventStateSnapshot) => {
      setSnapshot(payload);
      setLiveStatus(EventStatus.QUESTION_ACTIVE);
      setLastResult(null);
    });
    socket.on(SocketEvent.QUESTION_ENDED, (payload: QuestionEndedPayload) => {
      setLastResult(payload.result);
      setLiveStatus(EventStatus.QUESTION_REVIEW);
    });
    socket.on(SocketEvent.LEADERBOARD_UPDATE, (payload: Leaderboard) => {
      setLeaderboard(payload);
      setLiveStatus(EventStatus.LEADERBOARD);
    });
    socket.on(SocketEvent.EVENT_ENDED, (payload: EventEndedPayload) => {
      setEnded(payload);
      setLiveStatus(EventStatus.ENDED);
      setSnapshot(null);
    });
    socket.on(SocketEvent.ERROR, (payload: SocketErrorPayload) => toast.error(payload.message));

    return () => { socket.disconnect(); };
  }, [accessToken, eventId]);

  function emit(event: string, payload?: object) {
    socketRef.current?.emit(event, payload ?? { eventId });
  }

  const currentQuestion = snapshot?.currentQuestion;
  const isTimerEnabled = currentQuestion?.timerEnabled !== false;
  const isManual = !isTimerEnabled;

  /** Label + description for the current state shown in the control panel header */
  const statusLabel: Record<string, { label: string; description: string }> = {
    [EventStatus.LOBBY]: { label: "Lobby", description: "Waiting for participants to join" },
    [EventStatus.IN_PROGRESS]: { label: "Starting…", description: "Getting ready for the first question" },
    [EventStatus.QUESTION_ACTIVE]: {
      label: isManual ? "Question active (manual)" : "Question active (timer)",
      description: isManual ? "Participants are answering — click End Question when ready" : "Timer running — auto-advances when time runs out",
    },
    [EventStatus.QUESTION_REVIEW]: { label: "Results shown", description: "Participants can see the result — advance when ready" },
    [EventStatus.LEADERBOARD]: { label: "Leaderboard", description: "Participants see rankings — advance to next question when ready" },
    [EventStatus.ENDED]: { label: "Event ended", description: "All questions complete" },
    [EventStatus.ABORTED]: { label: "Aborted", description: "" },
  };
  const currentStatus = statusLabel[liveStatus] ?? { label: liveStatus, description: "" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Live Control</h1>
          <p className="text-sm text-muted-foreground">{currentStatus.description}</p>
        </div>
        <Badge className="ml-auto">{currentStatus.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Roster / join */}
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
                <Badge key={p.id} variant={p.isConnected ? "default" : "outline"}>{p.username}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main control panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current question info */}
            {currentQuestion && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Question {(snapshot?.questionIndex ?? 0) + 1} of {snapshot?.totalQuestions ?? "?"}
                  {isManual && <span className="ml-2 text-amber-400">· manual advance</span>}
                </p>
                <p className="text-lg font-semibold">{currentQuestion.prompt}</p>
                {isTimerEnabled && snapshot?.questionEndsAtMs && (
                  <QuestionTimer
                    endsAtMs={snapshot.questionEndsAtMs}
                    totalMs={currentQuestion.timeLimitSeconds * 1000}
                  />
                )}
                {isManual && (
                  <p className="text-sm text-amber-400">No timer — click "End Question" to close answers and show results.</p>
                )}
              </div>
            )}

            {/* Question result summary */}
            {lastResult && (
              <div className="rounded-md border border-emerald-800/40 bg-emerald-500/10 p-3 text-sm">
                <p className="font-medium text-emerald-400">Results in</p>
                <p className="text-muted-foreground">
                  {lastResult.totalResponses} responses · avg {Math.round(lastResult.averageResponseTimeMs / 100) / 10}s
                </p>
              </div>
            )}

            {/* ── Contextual action buttons ── */}
            <div className="flex flex-wrap gap-2">

              {/* LOBBY: start */}
              {liveStatus === EventStatus.LOBBY && (
                <Button onClick={() => emit(SocketEvent.HOST_START_EVENT)}>
                  <Play className="h-4 w-4" /> Start Event
                </Button>
              )}

              {/* QUESTION_ACTIVE: end question early / end timer-disabled question */}
              {liveStatus === EventStatus.QUESTION_ACTIVE && (
                <Button onClick={() => emit(SocketEvent.HOST_NEXT_QUESTION)}>
                  <Square className="h-4 w-4" />
                  {isManual ? "End Question & Show Results" : "End Question Early"}
                </Button>
              )}

              {/* QUESTION_REVIEW: show leaderboard or skip to next */}
              {liveStatus === EventStatus.QUESTION_REVIEW && (
                <Button onClick={() => emit(SocketEvent.HOST_NEXT_QUESTION)}>
                  <Trophy className="h-4 w-4" /> Show Leaderboard
                </Button>
              )}

              {/* LEADERBOARD: advance to next question */}
              {liveStatus === EventStatus.LEADERBOARD && (
                <Button onClick={() => emit(SocketEvent.HOST_NEXT_QUESTION)}>
                  <ChevronRight className="h-4 w-4" /> Next Question
                </Button>
              )}

              {/* Always available (when live) */}
              {liveStatus !== EventStatus.LOBBY && liveStatus !== EventStatus.ENDED && (
                <Button
                  variant="destructive"
                  onClick={() => emit(SocketEvent.HOST_END_EVENT)}
                >
                  <Square className="h-4 w-4" /> End Event
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live leaderboard */}
        {leaderboard && liveStatus === EventStatus.LEADERBOARD && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Current Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderboardList leaderboard={leaderboard} />
            </CardContent>
          </Card>
        )}

        {/* Final results */}
        {ended && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Event Complete — Final Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeaderboardList leaderboard={ended.finalLeaderboard} />
              <Button onClick={() => navigate(`/admin/events/${eventId}/analytics`)}>View Full Analytics</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
