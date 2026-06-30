import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ChoiceOption } from "@tribastion/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  options: ChoiceOption[];
  multiSelect: boolean;
  scored: boolean;
  onChange: (options: ChoiceOption[]) => void;
}

function SortableRow({
  option,
  multiSelect,
  scored,
  onChangeText,
  onToggleCorrect,
  onRemove,
  canRemove,
}: {
  option: ChoiceOption;
  multiSelect: boolean;
  scored: boolean;
  onChangeText: (text: string) => void;
  onToggleCorrect: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      {scored && (
        <button
          type="button"
          onClick={onToggleCorrect}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center border text-xs",
            multiSelect ? "rounded-md" : "rounded-full",
            option.isCorrect ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-input",
          )}
          title="Mark as correct"
        >
          {option.isCorrect ? "✓" : ""}
        </button>
      )}
      <Input value={option.text} onChange={(e) => onChangeText(e.target.value)} placeholder="Option text" />
      <Button type="button" variant="ghost" size="icon" disabled={!canRemove} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ChoiceOptionsField({ options, multiSelect, scored, onChange }: Props) {
  function update(id: string, patch: Partial<ChoiceOption>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function toggleCorrect(id: string) {
    if (multiSelect) {
      update(id, { isCorrect: !options.find((o) => o.id === id)?.isCorrect });
    } else {
      onChange(options.map((o) => ({ ...o, isCorrect: o.id === id })));
    }
  }

  function addOption() {
    onChange([...options, { id: crypto.randomUUID().slice(0, 10), text: "", isCorrect: false }]);
  }

  function removeOption(id: string) {
    onChange(options.filter((o) => o.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    const reordered = [...options];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);
    onChange(reordered);
  }

  return (
    <div className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {options.map((option) => (
            <SortableRow
              key={option.id}
              option={option}
              multiSelect={multiSelect}
              scored={scored}
              onChangeText={(text) => update(option.id, { text })}
              onToggleCorrect={() => toggleCorrect(option.id)}
              onRemove={() => removeOption(option.id)}
              canRemove={options.length > 2}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={options.length >= 12}>
        <Plus className="h-4 w-4" /> Add option
      </Button>
    </div>
  );
}
