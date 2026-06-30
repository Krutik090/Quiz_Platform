import type { Question, PublicQuestion } from "@tribastion/shared";

/** Strips correct-answer keys before a question is ever sent to a participant socket. */
export function toPublicQuestion(question: Question): PublicQuestion {
  const { ...rest } = question as unknown as Record<string, unknown>;
  delete rest.correctAnswer;
  delete rest.correctValue;
  delete rest.acceptedAnswers;

  if (Array.isArray(rest.options)) {
    rest.options = (rest.options as Record<string, unknown>[]).map(({ isCorrect, ...o }) => o);
  }
  if (Array.isArray(rest.items)) {
    rest.items = (rest.items as Record<string, unknown>[]).map(({ correctPosition, ...i }) => i);
  }
  if (Array.isArray(rest.pairs)) {
    rest.pairs = (rest.pairs as { id: string; left: string; right: string }[]).map((p) => ({
      id: p.id,
      left: p.left,
      right: p.right,
    }));
  }
  if (Array.isArray(rest.regions)) {
    rest.regions = (rest.regions as Record<string, unknown>[]).map(({ isCorrect, ...r }) => r);
  }

  return rest as unknown as PublicQuestion;
}
