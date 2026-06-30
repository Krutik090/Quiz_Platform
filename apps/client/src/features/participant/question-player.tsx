import { useState } from "react";
import { QuestionType, type PublicQuestion } from "@tribastion/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  question: PublicQuestion;
  disabled: boolean;
  onSubmit: (response: unknown) => void;
}

const OPTION_COLORS = ["bg-rose-500/20 border-rose-500", "bg-sky-500/20 border-sky-500", "bg-amber-500/20 border-amber-500", "bg-emerald-500/20 border-emerald-500"];

export function QuestionPlayer({ question, disabled, onSubmit }: Props) {
  const [submitted, setSubmitted] = useState(false);

  function submit(response: unknown) {
    if (submitted || disabled) return;
    setSubmitted(true);
    onSubmit(response);
  }

  if (submitted) {
    return <p className="py-10 text-center text-lg text-muted-foreground">Answer submitted — waiting for results…</p>;
  }

  switch (question.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.POLL:
    case QuestionType.IMAGE:
    case QuestionType.AUDIO:
    case QuestionType.VIDEO:
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.options?.map((opt, i) => (
            <button
              key={opt.id}
              disabled={disabled}
              onClick={() => submit({ optionId: opt.id })}
              className={cn("rounded-lg border-2 p-4 text-left text-base font-medium transition-transform active:scale-95", OPTION_COLORS[i % OPTION_COLORS.length])}
            >
              {opt.text}
            </button>
          ))}
        </div>
      );

    case QuestionType.MULTIPLE_CHOICE:
      return <MultipleChoicePlayer question={question} disabled={disabled} onSubmit={submit} />;

    case QuestionType.TRUE_FALSE:
      return (
        <div className="grid grid-cols-2 gap-3">
          <button disabled={disabled} onClick={() => submit({ value: true })} className="rounded-lg border-2 border-emerald-500 bg-emerald-500/20 p-6 text-xl font-bold">
            True
          </button>
          <button disabled={disabled} onClick={() => submit({ value: false })} className="rounded-lg border-2 border-rose-500 bg-rose-500/20 p-6 text-xl font-bold">
            False
          </button>
        </div>
      );

    case QuestionType.FILL_IN_BLANK:
      return <TextAnswerPlayer disabled={disabled} onSubmit={(text) => submit({ text })} placeholder="Type your answer" />;

    case QuestionType.OPEN_TEXT:
      return <TextAreaAnswerPlayer disabled={disabled} onSubmit={(text) => submit({ text })} />;

    case QuestionType.NUMERIC:
      return <NumericAnswerPlayer disabled={disabled} onSubmit={(value) => submit({ value })} />;

    case QuestionType.RATING:
      return <RatingPlayer disabled={disabled} onSubmit={(value) => submit({ value })} />;

    case QuestionType.ORDERING:
      return <OrderingPlayer question={question} disabled={disabled} onSubmit={(orderedIds) => submit({ orderedIds })} />;

    case QuestionType.MATCHING:
      return <MatchingPlayer question={question} disabled={disabled} onSubmit={(pairs) => submit({ pairs })} />;

    case QuestionType.HOTSPOT:
      return (
        <div className="relative mx-auto max-w-md">
          {question.imageUrl && <img src={question.imageUrl} alt="Hotspot" className="w-full rounded-lg" />}
          {question.regions?.map((r) => (
            <button
              key={r.id}
              disabled={disabled}
              onClick={() => submit({ regionId: r.id })}
              className="absolute rounded border-2 border-primary/0 hover:border-primary/70"
              style={{ left: `${r.xPct}%`, top: `${r.yPct}%`, width: `${r.widthPct}%`, height: `${r.heightPct}%` }}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
}

// single_choice/multiple_choice/poll share one ChoiceQuestion shape in the domain model (see
// quiz.types.ts), so narrowing must match that whole literal union, not MULTIPLE_CHOICE alone.
type MultipleChoicePublicQuestion = Extract<
  PublicQuestion,
  { type: typeof QuestionType.SINGLE_CHOICE | typeof QuestionType.MULTIPLE_CHOICE | typeof QuestionType.POLL }
>;
type OrderingPublicQuestion = Extract<PublicQuestion, { type: typeof QuestionType.ORDERING }>;
type MatchingPublicQuestion = Extract<PublicQuestion, { type: typeof QuestionType.MATCHING }>;

function MultipleChoicePlayer({ question, disabled, onSubmit }: { question: MultipleChoicePublicQuestion; disabled: boolean; onSubmit: (optionIds: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options?.map((opt, i) => (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => setSelected((s) => (s.includes(opt.id) ? s.filter((id) => id !== opt.id) : [...s, opt.id]))}
            className={cn(
              "rounded-lg border-2 p-4 text-left text-base font-medium transition-transform active:scale-95",
              OPTION_COLORS[i % OPTION_COLORS.length],
              selected.includes(opt.id) && "ring-2 ring-white",
            )}
          >
            {opt.text}
          </button>
        ))}
      </div>
      <Button className="w-full" disabled={disabled || selected.length === 0} onClick={() => onSubmit(selected)}>
        Submit answer
      </Button>
    </div>
  );
}

function TextAnswerPlayer({ disabled, onSubmit, placeholder }: { disabled: boolean; onSubmit: (text: string) => void; placeholder: string }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-3">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} disabled={disabled} className="text-center text-lg" />
      <Button className="w-full" disabled={disabled || !value.trim()} onClick={() => onSubmit(value)}>
        Submit answer
      </Button>
    </div>
  );
}

function TextAreaAnswerPlayer({ disabled, onSubmit }: { disabled: boolean; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-3">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} rows={4} placeholder="Type your response…" />
      <Button className="w-full" disabled={disabled || !value.trim()} onClick={() => onSubmit(value)}>
        Submit answer
      </Button>
    </div>
  );
}

function NumericAnswerPlayer({ disabled, onSubmit }: { disabled: boolean; onSubmit: (value: number) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-3">
      <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} className="text-center text-lg" />
      <Button className="w-full" disabled={disabled || value === ""} onClick={() => onSubmit(Number(value))}>
        Submit answer
      </Button>
    </div>
  );
}

function RatingPlayer({ disabled, onSubmit }: { disabled: boolean; onSubmit: (value: number) => void }) {
  const [value, setValue] = useState(3);
  return (
    <div className="space-y-4 text-center">
      <p className="text-4xl font-bold text-primary">{value}</p>
      <input type="range" min={1} max={5} value={value} disabled={disabled} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-primary" />
      <Button className="w-full" disabled={disabled} onClick={() => onSubmit(value)}>
        Submit rating
      </Button>
    </div>
  );
}

function OrderingPlayer({ question, disabled, onSubmit }: { question: OrderingPublicQuestion; disabled: boolean; onSubmit: (orderedIds: string[]) => void }) {
  const [order, setOrder] = useState(() => question.items?.map((i) => i.id) ?? []);

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  }

  return (
    <div className="space-y-3">
      {order.map((id, index) => {
        const item = question.items?.find((i) => i.id === id);
        return (
          <div key={id} className="flex items-center gap-2 rounded-md border border-input p-3">
            <span className="w-6 text-center font-bold text-primary">{index + 1}</span>
            <span className="flex-1">{item?.text}</span>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => move(index, -1)}>
              ↑
            </Button>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => move(index, 1)}>
              ↓
            </Button>
          </div>
        );
      })}
      <Button className="w-full" disabled={disabled} onClick={() => onSubmit(order)}>
        Submit order
      </Button>
    </div>
  );
}

function MatchingPlayer({ question, disabled, onSubmit }: { question: MatchingPublicQuestion; disabled: boolean; onSubmit: (pairs: { leftId: string; rightId: string }[]) => void }) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const pairs = question.pairs ?? [];

  return (
    <div className="space-y-3">
      {pairs.map((pair) => (
        <div key={pair.id} className="flex items-center gap-3">
          <span className="flex-1 rounded-md border border-input p-2 text-sm">{pair.left}</span>
          <Select disabled={disabled} value={selections[pair.id]} onValueChange={(v) => setSelections((s) => ({ ...s, [pair.id]: v }))}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Match…" />
            </SelectTrigger>
            <SelectContent>
              {pairs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.right}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <Button
        className="w-full"
        disabled={disabled || Object.keys(selections).length !== pairs.length}
        onClick={() => onSubmit(Object.entries(selections).map(([leftId, rightId]) => ({ leftId, rightId })))}
      >
        Submit matches
      </Button>
    </div>
  );
}
