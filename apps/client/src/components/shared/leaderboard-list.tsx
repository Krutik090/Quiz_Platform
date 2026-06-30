import type { Leaderboard } from "@tribastion/shared";
import { cn } from "@/lib/utils";

const MEDAL_COLORS = ["text-yellow-400", "text-zinc-300", "text-amber-600"];

export function LeaderboardList({ leaderboard, highlightParticipantId }: { leaderboard: Leaderboard; highlightParticipantId?: string }) {
  return (
    <ol className="space-y-1.5">
      {leaderboard.entries.map((entry) => (
        <li
          key={entry.participantId}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm",
            entry.participantId === highlightParticipantId ? "bg-primary/15 ring-1 ring-primary" : "bg-white/[0.03]",
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn("w-6 text-center font-bold tabular-nums", MEDAL_COLORS[entry.rank - 1] ?? "text-muted-foreground")}>
              {entry.rank}
            </span>
            <span className="font-medium">{entry.username}</span>
          </div>
          <span className="font-semibold tabular-nums text-primary">{entry.score.toLocaleString()}</span>
        </li>
      ))}
      {leaderboard.entries.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No scores yet</p>}
    </ol>
  );
}
