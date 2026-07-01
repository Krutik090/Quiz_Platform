import { Check, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Question } from "@tribastion/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_LABELS } from "@/features/quiz-builder/question-defaults";

interface Props {
  questions: Question[];
  selectedId: string | null;
  savedIds: Set<string>;
  onSelect: (id: string) => void;
  onReorder: (questions: Question[]) => void;
  onRemove: (id: string) => void;
}

function Row({
  question,
  index,
  selected,
  saved,
  onSelect,
  onRemove,
}: {
  question: Question;
  index: number;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors",
        selected ? "border-primary bg-primary/10" : "border-transparent hover:bg-white/5",
      )}
    >
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{question.prompt || `Question ${index + 1}`}</p>
        <p className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[question.type]}</p>
      </div>
      {saved && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function QuestionListSidebar({ questions, selectedId, savedIds, onSelect, onReorder, onRemove }: Props) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    const reordered = [...questions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);
    onReorder(reordered.map((q, i) => ({ ...q, order: i })));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {questions.map((q, i) => (
            <Row
              key={q.id}
              question={q}
              index={i}
              selected={q.id === selectedId}
              saved={savedIds.has(q.id)}
              onSelect={() => onSelect(q.id)}
              onRemove={() => onRemove(q.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
