import { Plus, Trash2 } from "lucide-react";
import type { HotspotRegion } from "@tribastion/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaUploadField } from "@/features/quiz-builder/fields/media-upload-field";

interface Props {
  imageUrl: string;
  regions: HotspotRegion[];
  onImageChange: (url: string) => void;
  onRegionsChange: (regions: HotspotRegion[]) => void;
}

export function HotspotField({ imageUrl, regions, onImageChange, onRegionsChange }: Props) {
  function update(id: string, patch: Partial<HotspotRegion>) {
    onRegionsChange(regions.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRegion() {
    onRegionsChange([...regions, { id: crypto.randomUUID().slice(0, 10), xPct: 25, yPct: 25, widthPct: 20, heightPct: 20, isCorrect: regions.length === 0 }]);
  }

  return (
    <div className="space-y-3">
      <MediaUploadField url={imageUrl} onChange={onImageChange} accept="image/*" />

      {imageUrl && (
        <div className="relative w-full max-w-md overflow-hidden rounded-md border border-input">
          <img src={imageUrl} alt="Hotspot" className="w-full" />
          {regions.map((r) => (
            <div
              key={r.id}
              className="absolute border-2 border-dashed border-primary/70 bg-primary/10"
              style={{ left: `${r.xPct}%`, top: `${r.yPct}%`, width: `${r.widthPct}%`, height: `${r.heightPct}%` }}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {regions.map((region) => (
          <div key={region.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] items-center gap-2">
            <Input type="number" value={region.xPct} onChange={(e) => update(region.id, { xPct: Number(e.target.value) })} placeholder="X%" />
            <Input type="number" value={region.yPct} onChange={(e) => update(region.id, { yPct: Number(e.target.value) })} placeholder="Y%" />
            <Input type="number" value={region.widthPct} onChange={(e) => update(region.id, { widthPct: Number(e.target.value) })} placeholder="W%" />
            <Input type="number" value={region.heightPct} onChange={(e) => update(region.id, { heightPct: Number(e.target.value) })} placeholder="H%" />
            <Button
              type="button"
              variant={region.isCorrect ? "default" : "outline"}
              size="sm"
              onClick={() => onRegionsChange(regions.map((r) => ({ ...r, isCorrect: r.id === region.id })))}
            >
              Correct
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRegionsChange(regions.filter((r) => r.id !== region.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRegion} disabled={!imageUrl}>
        <Plus className="h-4 w-4" /> Add region
      </Button>
    </div>
  );
}
