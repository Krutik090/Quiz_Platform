import { Plus, Trash2 } from "lucide-react";
import type { MatchingPair } from "@tribastion/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  pairs: MatchingPair[];
  onChange: (pairs: MatchingPair[]) => void;
}

export function MatchingField({ pairs, onChange }: Props) {
  function update(id: string, patch: Partial<MatchingPair>) {
    onChange(pairs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPair() {
    onChange([...pairs, { id: crypto.randomUUID().slice(0, 10), left: "", right: "" }]);
  }

  function removePair(id: string) {
    onChange(pairs.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-xs text-muted-foreground">
        <span>Left</span>
        <span>Matches with</span>
        <span />
      </div>
      {pairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
          <Input value={pair.left} onChange={(e) => update(pair.id, { left: e.target.value })} placeholder="Left item" />
          <Input value={pair.right} onChange={(e) => update(pair.id, { right: e.target.value })} placeholder="Right item" />
          <Button type="button" variant="ghost" size="icon" disabled={pairs.length <= 2} onClick={() => removePair(pair.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addPair} disabled={pairs.length >= 20}>
        <Plus className="h-4 w-4" /> Add pair
      </Button>
    </div>
  );
}
