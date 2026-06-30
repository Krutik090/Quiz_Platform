import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Play, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quizApi } from "@/api/quiz.api";
import { eventApi } from "@/api/event.api";
import { getApiErrorMessage } from "@/lib/api-client";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["quizzes"], queryFn: () => quizApi.list() });

  const createMutation = useMutation({
    mutationFn: () => quizApi.create({ title: newTitle }),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setDialogOpen(false);
      setNewTitle("");
      navigate(`/admin/quizzes/${quiz.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to create quiz")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to delete quiz")),
  });

  const startMutation = useMutation({
    mutationFn: (quizId: string) => eventApi.create(quizId),
    onSuccess: (event) => navigate(`/admin/events/${event.id}/control`),
    onError: (err) => toast.error(getApiErrorMessage(err, "Failed to start event")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Create, manage, and launch live quizzes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New quiz
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new quiz</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Product Knowledge Quiz" />
            </div>
            <Button disabled={!newTitle.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((quiz) => (
          <Card key={quiz.id} className="animate-fade-in">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                <Badge variant={quiz.status === "published" ? "success" : "secondary"}>{quiz.status}</Badge>
              </div>
              <CardDescription>{quiz.questions.length} questions</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{quiz.description || "No description"}</CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/quizzes/${quiz.id}`)}>
                Edit
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={quiz.questions.length === 0 || startMutation.isPending}
                  onClick={() => startMutation.mutate(quiz.id)}
                  title={quiz.questions.length === 0 ? "Add questions before starting" : "Start a live event"}
                >
                  <Play className="h-4 w-4" /> Start
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(quiz.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 opacity-40" />
          <p>No quizzes yet. Create your first one to get started.</p>
        </div>
      )}
    </div>
  );
}
