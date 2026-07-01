import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus, Save, Send } from "lucide-react";
import { QuestionType, type Question } from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { quizApi } from "@/api/quiz.api";
import { getApiErrorMessage } from "@/lib/api-client";
import { QuestionListSidebar } from "@/features/quiz-builder/question-list-sidebar";
import { QuestionEditor } from "@/features/quiz-builder/question-editor";
import { createDefaultQuestion, QUESTION_TYPE_LABELS } from "@/features/quiz-builder/question-defaults";
import { cn } from "@/lib/utils";

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
  const [questionPickerOpen, setQuestionPickerOpen] = useState(false);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());

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
    setQuestionPickerOpen(false);
  }

  function updateQuestion(updated: Question) {
    setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)));
    // Un-mark as saved when a change is made after saving
    if (savedQuestionIds.has(updated.id)) {
      setSavedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(updated.id);
        return next;
      });
    }
  }

  function removeQuestion(id: string) {
    const next = questions.filter((q) => q.id !== id);
    setQuestions(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setSavedQuestionIds((prev) => {
      const next2 = new Set(prev);
      next2.delete(id);
      return next2;
    });
  }

  function saveCurrentQuestion() {
    if (!selected) return;
    if (!selected.prompt.trim()) {
      toast.error("Question prompt cannot be empty");
      return;
    }
    setSavedQuestionIds((prev) => new Set([...prev, selected.id]));
    toast.success("Question saved");
  }

  const selected = questions.find((q) => q.id === selectedId) ?? null;
  const isSelectedSaved = selected ? savedQuestionIds.has(selected.id) : false;

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md text-lg font-semibold" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Save className="h-4 w-4" /> Save quiz
          </Button>
          <Button disabled={publishMutation.isPending || questions.length === 0} onClick={() => publishMutation.mutate()}>
            <Send className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {/* Quiz-level settings */}
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
        {/* Left — question list */}
        <Card className="h-fit">
          <CardContent className="space-y-3 p-4">
            {/* Add New Question button — uses a Dialog to avoid the Radix Select re-select bug
                (Radix Select doesn't fire onValueChange when the same item is selected twice,
                so re-adding the same question type with a dropdown would silently fail). */}
            <Button className="w-full" onClick={() => setQuestionPickerOpen(true)}>
              <Plus className="h-4 w-4" /> Add new question
            </Button>

            <QuestionListSidebar
              questions={questions}
              selectedId={selectedId}
              savedIds={savedQuestionIds}
              onSelect={setSelectedId}
              onReorder={setQuestions}
              onRemove={removeQuestion}
            />
            {questions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No questions yet. Click "Add new question" to start.</p>
            )}
          </CardContent>
        </Card>

        {/* Right — question editor */}
        <Card>
          {selected ? (
            <>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base text-muted-foreground">
                  Question {(questions.findIndex((q) => q.id === selected.id) + 1)} of {questions.length}
                </CardTitle>
                <Button
                  onClick={saveCurrentQuestion}
                  variant={isSelectedSaved ? "secondary" : "default"}
                  size="sm"
                  className={cn(isSelectedSaved && "text-emerald-400")}
                >
                  <Check className="h-4 w-4" />
                  {isSelectedSaved ? "Saved" : "Save question"}
                </Button>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <QuestionEditor question={selected} onChange={updateQuestion} />
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
              <Plus className="h-5 w-5" /> Add a question to get started
            </CardContent>
          )}
        </Card>
      </div>

      {/* Question type picker dialog */}
      <Dialog open={questionPickerOpen} onOpenChange={setQuestionPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a question type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(QuestionType).map((type) => (
              <button
                key={type}
                onClick={() => addQuestion(type)}
                className="rounded-lg border border-input bg-background/50 px-3 py-3 text-left text-sm hover:border-primary hover:bg-primary/10 transition-colors"
              >
                <span className="font-medium">{QUESTION_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
