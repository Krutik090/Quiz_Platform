import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface Props {
  endsAtMs: number;
  /** Used only to compute the progress bar's starting percentage; the countdown itself always derives from server time. */
  totalMs?: number;
}

/** Renders a countdown purely from the server-provided end timestamp — never trusts a client-side timer as authoritative. */
export function QuestionTimer({ endsAtMs, totalMs }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAtMs - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, endsAtMs - Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [endsAtMs]);

  const total = totalMs ?? remainingMs;
  const pct = total > 0 ? Math.min(100, (remainingMs / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <Progress value={pct} className={remainingMs < 5000 ? "[&>div]:bg-destructive" : ""} />
      <p className="text-right text-sm tabular-nums text-muted-foreground">{Math.ceil(remainingMs / 1000)}s</p>
    </div>
  );
}
