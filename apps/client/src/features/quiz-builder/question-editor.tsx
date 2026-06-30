import { QuestionType, AUTO_SCORED_TYPES, type Question } from "@tribastion/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChoiceOptionsField } from "@/features/quiz-builder/fields/choice-options-field";
import { OrderingField } from "@/features/quiz-builder/fields/ordering-field";
import { MatchingField } from "@/features/quiz-builder/fields/matching-field";
import { HotspotField } from "@/features/quiz-builder/fields/hotspot-field";
import { ChipsInput } from "@/features/quiz-builder/fields/chips-input";
import { MediaUploadField } from "@/features/quiz-builder/fields/media-upload-field";

interface Props {
  question: Question;
  onChange: (question: Question) => void;
}

export function QuestionEditor({ question, onChange }: Props) {
  function patch(p: Partial<Question>) {
    onChange({ ...question, ...p } as Question);
  }

  function patchScoring(p: Partial<Question["scoring"]>) {
    onChange({ ...question, scoring: { ...question.scoring, ...p } } as Question);
  }

  const scored = AUTO_SCORED_TYPES.has(question.type);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>Question prompt</Label>
        <Textarea value={question.prompt} onChange={(e) => patch({ prompt: e.target.value })} placeholder="What is the capital of France?" rows={2} />
      </div>

      {(question.type === QuestionType.IMAGE || question.type === QuestionType.AUDIO || question.type === QuestionType.VIDEO) && (
        <div className="space-y-1.5">
          <Label>Question media</Label>
          <MediaUploadField
            url={question.media?.url ?? ""}
            accept={question.type === QuestionType.IMAGE ? "image/*" : question.type === QuestionType.AUDIO ? "audio/*" : "video/*"}
            onChange={(url) => patch({ media: url ? { url, mimeType: "", sizeBytes: 0 } : undefined })}
          />
        </div>
      )}

      <TypeSpecificFields question={question} onChange={onChange} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Time limit (seconds)</Label>
          <Input type="number" min={3} max={600} value={question.timeLimitSeconds} onChange={(e) => patch({ timeLimitSeconds: Number(e.target.value) })} />
        </div>
        {scored && (
          <div className="space-y-1.5">
            <Label>Base points</Label>
            <Input
              type="number"
              min={0}
              max={10000}
              value={question.scoring.basePoints}
              onChange={(e) => {
                const basePoints = Number(e.target.value);
                patchScoring({ basePoints });
                patch({ points: basePoints });
              }}
            />
          </div>
        )}
      </div>

      {scored && (
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={question.scoring.speedBonus} onCheckedChange={(v) => patchScoring({ speedBonus: v })} />
            <Label>Speed bonus</Label>
          </div>
          {("randomizeOptions" in question) && (
            <div className="flex items-center gap-2">
              <Switch checked={question.randomizeOptions} onCheckedChange={(v) => patch({ randomizeOptions: v } as Partial<Question>)} />
              <Label>Randomize options</Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeSpecificFields({ question, onChange }: Props) {
  switch (question.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.POLL:
    case QuestionType.IMAGE:
    case QuestionType.AUDIO:
    case QuestionType.VIDEO:
      return (
        <ChoiceOptionsField
          options={question.options}
          multiSelect={false}
          scored={question.type !== QuestionType.POLL}
          onChange={(options) => onChange({ ...question, options })}
        />
      );

    case QuestionType.MULTIPLE_CHOICE:
      return <ChoiceOptionsField options={question.options} multiSelect scored onChange={(options) => onChange({ ...question, options })} />;

    case QuestionType.TRUE_FALSE:
      return (
        <div className="flex gap-3">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => onChange({ ...question, correctAnswer: val })}
              className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
                question.correctAnswer === val ? "border-primary bg-primary/15 text-primary" : "border-input"
              }`}
            >
              {val ? "True" : "False"}
            </button>
          ))}
        </div>
      );

    case QuestionType.FILL_IN_BLANK:
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Accepted answers</Label>
            <ChipsInput values={question.acceptedAnswers ?? []} onChange={(acceptedAnswers) => onChange({ ...question, acceptedAnswers })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={question.caseSensitive} onCheckedChange={(v) => onChange({ ...question, caseSensitive: v })} />
            <Label>Case sensitive</Label>
          </div>
        </div>
      );

    case QuestionType.RATING:
      return (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Min</Label>
            <Input type="number" value={question.minValue} onChange={(e) => onChange({ ...question, minValue: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Max</Label>
            <Input type="number" value={question.maxValue} onChange={(e) => onChange({ ...question, maxValue: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Step</Label>
            <Input type="number" value={question.step} onChange={(e) => onChange({ ...question, step: Number(e.target.value) })} />
          </div>
        </div>
      );

    case QuestionType.ORDERING:
      return <OrderingField items={question.items} onChange={(items) => onChange({ ...question, items })} />;

    case QuestionType.MATCHING:
      return <MatchingField pairs={question.pairs} onChange={(pairs) => onChange({ ...question, pairs })} />;

    case QuestionType.HOTSPOT:
      return (
        <HotspotField
          imageUrl={question.imageUrl}
          regions={question.regions}
          onImageChange={(imageUrl) => onChange({ ...question, imageUrl })}
          onRegionsChange={(regions) => onChange({ ...question, regions })}
        />
      );

    case QuestionType.NUMERIC:
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Correct value</Label>
            <Input type="number" value={question.correctValue ?? 0} onChange={(e) => onChange({ ...question, correctValue: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tolerance (±)</Label>
            <Input type="number" min={0} value={question.tolerance} onChange={(e) => onChange({ ...question, tolerance: Number(e.target.value) })} />
          </div>
        </div>
      );

    case QuestionType.OPEN_TEXT:
      return (
        <div className="space-y-1.5">
          <Label>Max length</Label>
          <Input type="number" min={1} max={5000} value={question.maxLength} onChange={(e) => onChange({ ...question, maxLength: Number(e.target.value) })} />
        </div>
      );

    default:
      return null;
  }
}
