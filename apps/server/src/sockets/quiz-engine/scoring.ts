import { AUTO_SCORED_TYPES, QuestionType, type Question } from "@tribastion/shared";

export interface ScoringResult {
  isCorrect: boolean;
  /** Fraction of correctness in [0, 1] — 1 for fully correct, fractional only when partial credit applies. */
  correctnessFraction: number;
  pointsAwarded: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Pure correctness evaluation per question type. Never trusts anything from the client except the parsed response shape. */
function evaluateCorrectness(question: Question, response: unknown): number {
  switch (question.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.POLL:
    case QuestionType.IMAGE:
    case QuestionType.AUDIO:
    case QuestionType.VIDEO: {
      const { optionId } = response as { optionId: string };
      const correct = question.options.find((o) => o.isCorrect)?.id;
      return optionId === correct ? 1 : 0;
    }

    case QuestionType.MULTIPLE_CHOICE: {
      const { optionIds } = response as { optionIds: string[] };
      const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
      const selected = new Set(optionIds);
      if (!question.scoring.partialCreditEnabled) {
        return selected.size === correctIds.size && [...selected].every((id) => correctIds.has(id)) ? 1 : 0;
      }
      let correctSelected = 0;
      let incorrectSelected = 0;
      for (const id of selected) {
        if (correctIds.has(id)) correctSelected++;
        else incorrectSelected++;
      }
      return clamp01((correctSelected - incorrectSelected) / Math.max(correctIds.size, 1));
    }

    case QuestionType.TRUE_FALSE: {
      const { value } = response as { value: boolean };
      return value === question.correctAnswer ? 1 : 0;
    }

    case QuestionType.FILL_IN_BLANK: {
      const { text } = response as { text: string };
      const accepted = question.acceptedAnswers ?? [];
      const normalize = (s: string) => (question.caseSensitive ? s.trim() : s.trim().toLowerCase());
      const target = normalize(text);
      return accepted.some((a) => normalize(a) === target) ? 1 : 0;
    }

    case QuestionType.ORDERING: {
      const { orderedIds } = response as { orderedIds: string[] };
      const correctOrder = [...question.items].sort((a, b) => (a.correctPosition ?? 0) - (b.correctPosition ?? 0)).map((i) => i.id);
      if (orderedIds.length !== correctOrder.length) return 0;
      if (!question.scoring.partialCreditEnabled) {
        return orderedIds.every((id, i) => id === correctOrder[i]) ? 1 : 0;
      }
      const correctPositions = orderedIds.filter((id, i) => id === correctOrder[i]).length;
      return clamp01(correctPositions / correctOrder.length);
    }

    case QuestionType.MATCHING: {
      const { pairs } = response as { pairs: { leftId: string; rightId: string }[] };
      const correctPairs = new Map(question.pairs.map((p) => [p.id, p.id]));
      if (!question.scoring.partialCreditEnabled) {
        if (pairs.length !== question.pairs.length) return 0;
        return pairs.every((p) => p.leftId === p.rightId && correctPairs.has(p.leftId)) ? 1 : 0;
      }
      const correctCount = pairs.filter((p) => p.leftId === p.rightId && correctPairs.has(p.leftId)).length;
      return clamp01(correctCount / Math.max(question.pairs.length, 1));
    }

    case QuestionType.HOTSPOT: {
      const { regionId } = response as { regionId: string };
      const region = question.regions.find((r) => r.id === regionId);
      return region?.isCorrect ? 1 : 0;
    }

    case QuestionType.NUMERIC: {
      const { value } = response as { value: number };
      if (question.correctValue === undefined) return 0;
      return Math.abs(value - question.correctValue) <= question.tolerance ? 1 : 0;
    }

    default:
      return 0;
  }
}

export function scoreAnswer(
  question: Question,
  response: unknown,
  responseTimeMs: number,
): ScoringResult {
  if (!AUTO_SCORED_TYPES.has(question.type)) {
    return { isCorrect: false, correctnessFraction: 0, pointsAwarded: 0 };
  }

  const fraction = evaluateCorrectness(question, response);
  const isCorrect = fraction >= 1;

  if (fraction <= 0) {
    const penalty = Math.round(question.scoring.negativeMarkingMultiplier * question.scoring.basePoints);
    return { isCorrect: false, correctnessFraction: 0, pointsAwarded: penalty === 0 ? 0 : -penalty };
  }

  let points = question.scoring.basePoints * fraction;

  if (question.scoring.speedBonus && isCorrect) {
    const timeLimitMs = question.timeLimitSeconds * 1000;
    const speedFactor = clamp01(1 - responseTimeMs / timeLimitMs);
    // Up to +50% bonus for an instant answer, scaling down to +0% at the time limit.
    points *= 1 + 0.5 * speedFactor;
  }

  return { isCorrect, correctnessFraction: fraction, pointsAwarded: Math.round(points) };
}
