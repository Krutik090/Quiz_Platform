import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AVATAR_OPTIONS, type AvatarOption } from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { participantApi } from "@/api/participant.api";
import { useParticipantSessionStore } from "@/stores/participant-session.store";
import { getApiErrorMessage } from "@/lib/api-client";

const AVATAR_EMOJI: Record<AvatarOption, string> = {
  fox: "🦊",
  owl: "🦉",
  panda: "🐼",
  koala: "🐨",
  tiger: "🐯",
  robot: "🤖",
  astronaut: "🧑‍🚀",
  ninja: "🥷",
  wizard: "🧙",
  dragon: "🐉",
  octopus: "🐙",
  penguin: "🐧",
};

export default function JoinPage() {
  const { joinCode: joinCodeParam } = useParams<{ joinCode?: string }>();
  const navigate = useNavigate();
  const setSession = useParticipantSessionStore((s) => s.setSession);

  const [joinCode, setJoinCode] = useState(joinCodeParam?.toUpperCase() ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<AvatarOption>("fox");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await participantApi.join({ joinCode, username, email, avatar });
      setSession(result.participant.eventId, { participant: result.participant, token: result.token });
      navigate(`/play/${result.participant.eventId}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Unable to join this quiz"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="items-center text-center">
          <ShieldCheck className="mb-2 h-8 w-8 text-primary" />
          <CardTitle>
            Join a Tri<span className="text-gradient-brand">bastion</span> Quiz
          </CardTitle>
          <CardDescription>Enter the join code from your host to participate</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="joinCode">Join code</Label>
              <Input
                id="joinCode"
                required
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="text-center text-lg tracking-[0.3em]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Display name</Label>
              <Input id="username" required minLength={2} maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pick an avatar</Label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-xl",
                      avatar === a ? "border-primary bg-primary/15" : "border-input",
                    )}
                  >
                    {AVATAR_EMOJI[a]}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || joinCode.length !== 6}>
              {loading ? "Joining…" : "Join Quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
