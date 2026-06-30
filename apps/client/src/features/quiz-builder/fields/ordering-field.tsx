import { Plus, Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { OrderingItem } from "@tribastion/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  items: OrderingItem[];
  onChange: (items: OrderingItem[]) => void;
}

function Row({ item, index, onChangeText, onRemove, canRemove }: { item: OrderingItem; index: number; onChangeText: (t: string) => void; onRemove: () => void; canRemove: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 shrink-0 text-center text-sm text-muted-foreground">{index + 1}</span>
      <Input value={item.text} onChange={(e) => onChangeText(e.target.value)} placeholder="Item text" />
      <Button type="button" variant="ghost" size="icon" disabled={!canRemove} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Item order in the array *is* the correct order — drag to set the right answer sequence. */
export function OrderingField({ items, onChange }: Props) {
  function withPositions(list: OrderingItem[]) {
    return list.map((item, i) => ({ ...item, correctPosition: i }));
  }

  function updateText(id: string, text: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  }

  function addItem() {
    onChange(withPositions([...items, { id: crypto.randomUUID().slice(0, 10), text: "" }]));
  }

  function removeItem(id: string) {
    onChange(withPositions(items.filter((i) => i.id !== id)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);
    onChange(withPositions(reordered));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Drag items into the correct order — that order is the answer key.</p>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <Row key={item.id} item={item} index={index} onChangeText={(t) => updateText(item.id, t)} onRemove={() => removeItem(item.id)} canRemove={items.length > 2} />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={items.length >= 20}>
        <Plus className="h-4 w-4" /> Add item
      </Button>
    </div>
  );
}
