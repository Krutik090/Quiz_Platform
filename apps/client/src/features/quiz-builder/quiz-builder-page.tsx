import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Send } from "lucide-react";
import { QuestionType, type Question } from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { quizApi } from "@/api/quiz.api";
import { getApiErrorMessage } from "@/lib/api-client";
import { QuestionListSidebar } from "@/features/quiz-builder/question-list-sidebar";
import { QuestionEditor } from "@/features/quiz-builder/question-editor";
import { createDefaultQuestion, QUESTION_TYPE_LABELS } from "@/features/quiz-builder/question-defaults";

export default function QuizBuilderPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quiz, isLoading } = useQuery({ queryKey: ["quiz", quizId], queryFn: () => quizApi.get(quizId!), enabled: !!quizId });

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allowLateJoin, setAllowLateJoin] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [leaderboardDuration, setLeaderboardDuration] = useState(8);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);

  useEffect(() => {
    if (!quiz) return;
    setTitle(quiz.title);
    setQuestions(quiz.questions);
    setSelectedId(quiz.questions[0]?.id ?? null);
    setAllowLateJoin(quiz.settings.allowLateJoin);
    setShowLeaderboard(quiz.settings.showLeaderboardAfterEachQuestion);
    setLeaderboardDuration(quiz.settings.leaderboardDurationSeconds);
    setRandomizeQuestions(quiz.settings.randomizeQuestions);
  }, [quiz]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await quizApi.update(quizId!, {
        title,
        settings: {
          randomizeQuestions,
          randomizeAnswers: false,
          showLeaderboardAfterEachQuestion: showLeaderboard,
          leaderboardDurationSeconds: leaderboardDuration,
          allowLateJoin,
          defaultTimeLimitSeconds: 20,
          theme: { primaryColor: "#EC008C" },
        },
      });
      if (questions.length > 0) await quizApi.replaceQuestions(quizId!, questions);
    },
    onSuccess: () => {
      toast.success("Quiz saved");
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to save quiz")),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      await quizApi.publish(quizId!);
    },
    onSuccess: () => toast.success("Quiz published"),
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to publish quiz")),
  });

  function addQuestion(type: QuestionType) {
    const q = createDefaultQuestion(type, questions.length);
    setQuestions([...questions, q]);
    setSelectedId(q.id);
  }

  function updateQuestion(updated: Question) {
    setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)));
  }

  function removeQuestion(id: string) {
    const next = questions.filter((q) => q.id !== id);
    setQuestions(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  const selected = questions.find((q) => q.id === selectedId) ?? null;

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md text-lg font-semibold" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button disabled={publishMutation.isPending || questions.length === 0} onClick={() => publishMutation.mutate()}>
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-2">
            <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
            <Label>Randomize question order</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showLeaderboard} onCheckedChange={setShowLeaderboard} />
            <Label>Show leaderboard after each question</Label>
          </div>
          {showLeaderboard && (
            <div className="flex items-center gap-2">
              <Label>Leaderboard duration (s)</Label>
              <Input
                type="number"
                className="w-20"
                min={0}
                max={120}
                value={leaderboardDuration}
                onChange={(e) => setLeaderboardDuration(Number(e.target.value))}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={allowLateJoin} onCheckedChange={setAllowLateJoin} />
            <Label>Allow joining after the quiz starts</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            <Select onValueChange={(v) => addQuestion(v as QuestionType)}>
              <SelectTrigger>
                <SelectValue placeholder="Add a question…" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(QuestionType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {QUESTION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <QuestionListSidebar
              questions={questions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={setQuestions}
              onRemove={removeQuestion}
            />
            {questions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No questions yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {selected ? (
              <QuestionEditor question={selected} onChange={updateQuestion} />
            ) : (
              <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                <Plus className="h-5 w-5" /> Add a question to get started
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
