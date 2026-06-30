import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Download } from "lucide-react";
import { ExportFormat } from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyticsApi } from "@/api/analytics.api";

export default function AnalyticsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", eventId],
    queryFn: () => analyticsApi.getEventAnalytics(eventId!),
    enabled: !!eventId,
  });

  if (isLoading || !analytics) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{analytics.quizTitle} — Analytics</h1>
        </div>
        <div className="flex gap-2">
          {Object.values(ExportFormat).map((format) => (
            <Button key={format} variant="outline" size="sm" onClick={() => analyticsApi.downloadExport(eventId!, format)}>
              <Download className="h-4 w-4" /> {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Joined</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.participation.totalJoined}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.participation.totalCompleted}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Questions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{analytics.questions.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final Rankings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {analytics.finalRankings.slice(0, 20).map((r) => (
            <div key={r.participantId} className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2 text-sm">
              <span>
                <Badge variant="secondary" className="mr-2">
                  #{r.rank}
                </Badge>
                {r.username}
              </span>
              <span className="font-semibold text-primary">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {analytics.questions.map((q) => (
          <Card key={q.questionId}>
            <CardHeader>
              <CardTitle className="text-base">{q.prompt}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {q.totalResponses} responses · {q.correctCount} correct · avg {Math.round(q.averageResponseTimeMs / 100) / 10}s
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={Object.entries(q.answerDistribution).map(([key, value]) => ({ name: key.slice(0, 24), value }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" fill="#EC008C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
