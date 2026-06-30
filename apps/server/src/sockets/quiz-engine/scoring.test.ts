import { describe, expect, it } from "vitest";
import { QuestionType, type ChoiceQuestion, type NumericQuestion, type TrueFalseQuestion } from "@tribastion/shared";
import { scoreAnswer } from "@/sockets/quiz-engine/scoring";

const baseScoring = { basePoints: 1000, speedBonus: false, negativeMarkingMultiplier: 0, partialCreditEnabled: false };

function singleChoiceQuestion(): ChoiceQuestion {
  return {
    id: "q1",
    type: QuestionType.SINGLE_CHOICE,
    prompt: "2 + 2?",
    timeLimitSeconds: 20,
    points: 1000,
    scoring: baseScoring,
    order: 0,
    required: true,
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "4", isCorrect: true },
    ],
    randomizeOptions: false,
  };
}

describe("scoreAnswer", () => {
  it("awards full points for a correct single-choice answer with no speed bonus", () => {
    const result = scoreAnswer(singleChoiceQuestion(), { optionId: "b" }, 5000);
    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(1000);
  });

  it("awards zero points for an incorrect answer with no negative marking", () => {
    const result = scoreAnswer(singleChoiceQuestion(), { optionId: "a" }, 5000);
    expect(result.isCorrect).toBe(false);
    expect(result.pointsAwarded).toBe(0);
  });

  it("applies negative marking as a penalty on incorrect answers", () => {
    const question = singleChoiceQuestion();
    question.scoring = { ...baseScoring, negativeMarkingMultiplier: 0.5 };
    const result = scoreAnswer(question, { optionId: "a" }, 5000);
    expect(result.pointsAwarded).toBe(-500);
  });

  it("gives a faster correct answer more points than a slower one when speed bonus is enabled", () => {
    const question = singleChoiceQuestion();
    question.scoring = { ...baseScoring, speedBonus: true };
    const fast = scoreAnswer(question, { optionId: "b" }, 1000);
    const slow = scoreAnswer(question, { optionId: "b" }, 19000);
    expect(fast.pointsAwarded).toBeGreaterThan(slow.pointsAwarded);
    expect(slow.pointsAwarded).toBeGreaterThanOrEqual(1000);
  });

  it("never awards points for an unscored type like poll", () => {
    const question = { ...singleChoiceQuestion(), type: QuestionType.POLL } as ChoiceQuestion;
    const result = scoreAnswer(question, { optionId: "b" }, 1000);
    expect(result.pointsAwarded).toBe(0);
    expect(result.isCorrect).toBe(false);
  });

  it("scores true/false against the correct boolean", () => {
    const question: TrueFalseQuestion = {
      id: "q2",
      type: QuestionType.TRUE_FALSE,
      prompt: "The sky is blue",
      timeLimitSeconds: 10,
      points: 1000,
      scoring: baseScoring,
      order: 0,
      required: true,
      correctAnswer: true,
    };
    expect(scoreAnswer(question, { value: true }, 1000).isCorrect).toBe(true);
    expect(scoreAnswer(question, { value: false }, 1000).isCorrect).toBe(false);
  });

  it("scores numeric answers within tolerance as correct", () => {
    const question: NumericQuestion = {
      id: "q3",
      type: QuestionType.NUMERIC,
      prompt: "Value of pi to 1 decimal?",
      timeLimitSeconds: 10,
      points: 1000,
      scoring: baseScoring,
      order: 0,
      required: true,
      correctValue: 3.14,
      tolerance: 0.05,
    };
    expect(scoreAnswer(question, { value: 3.16 }, 1000).isCorrect).toBe(true);
    expect(scoreAnswer(question, { value: 3.5 }, 1000).isCorrect).toBe(false);
  });

  it("grants partial credit on multiple choice when enabled", () => {
    const question = {
      id: "q4",
      type: QuestionType.MULTIPLE_CHOICE,
      prompt: "Pick all primes",
      timeLimitSeconds: 10,
      points: 1000,
      scoring: { ...baseScoring, partialCreditEnabled: true },
      order: 0,
      required: true,
      options: [
        { id: "a", text: "2", isCorrect: true },
        { id: "b", text: "3", isCorrect: true },
        { id: "c", text: "4", isCorrect: false },
      ],
      randomizeOptions: false,
    } as ChoiceQuestion;

    const partial = scoreAnswer(question, { optionIds: ["a"] }, 1000);
    expect(partial.isCorrect).toBe(false);
    expect(partial.pointsAwarded).toBeGreaterThan(0);
    expect(partial.pointsAwarded).toBeLessThan(1000);

    const full = scoreAnswer(question, { optionIds: ["a", "b"] }, 1000);
    expect(full.isCorrect).toBe(true);
    expect(full.pointsAwarded).toBe(1000);
  });
});
