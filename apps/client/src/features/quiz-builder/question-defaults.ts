import { QuestionType, type Question, type ScoringConfig } from "@tribastion/shared";

function newId() {
  return crypto.randomUUID().slice(0, 10);
}

const defaultScoring: ScoringConfig = {
  basePoints: 1000,
  speedBonus: true,
  negativeMarkingMultiplier: 0,
  partialCreditEnabled: false,
};

const baseDefaults = (order: number) => ({
  id: newId(),
  prompt: "",
  timeLimitSeconds: 20,
  points: 1000,
  scoring: { ...defaultScoring },
  order,
  required: true,
});

export function createDefaultQuestion(type: QuestionType, order: number): Question {
  const base = baseDefaults(order);

  switch (type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.POLL:
    case QuestionType.IMAGE:
    case QuestionType.AUDIO:
    case QuestionType.VIDEO:
      return {
        ...base,
        type,
        options: [
          { id: newId(), text: "", isCorrect: type !== QuestionType.POLL },
          { id: newId(), text: "", isCorrect: false },
        ],
        randomizeOptions: false,
      } as Question;

    case QuestionType.TRUE_FALSE:
      return { ...base, type, correctAnswer: true } as Question;

    case QuestionType.FILL_IN_BLANK:
      return { ...base, type, acceptedAnswers: [], caseSensitive: false } as Question;

    case QuestionType.RATING:
      return { ...base, type, minValue: 1, maxValue: 5, step: 1, scoring: { ...defaultScoring, basePoints: 0 } } as Question;

    case QuestionType.ORDERING:
      return {
        ...base,
        type,
        items: [
          { id: newId(), text: "", correctPosition: 0 },
          { id: newId(), text: "", correctPosition: 1 },
        ],
      } as Question;

    case QuestionType.MATCHING:
      return {
        ...base,
        type,
        pairs: [
          { id: newId(), left: "", right: "" },
          { id: newId(), left: "", right: "" },
        ],
      } as Question;

    case QuestionType.HOTSPOT:
      return { ...base, type, imageUrl: "", regions: [] } as Question;

    case QuestionType.NUMERIC:
      return { ...base, type, correctValue: 0, tolerance: 0 } as Question;

    case QuestionType.OPEN_TEXT:
      return { ...base, type, maxLength: 500, scoring: { ...defaultScoring, basePoints: 0 } } as Question;

    default:
      throw new Error(`Unsupported question type: ${type}`);
  }
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.SINGLE_CHOICE]: "Single Choice",
  [QuestionType.MULTIPLE_CHOICE]: "Multiple Choice",
  [QuestionType.TRUE_FALSE]: "True / False",
  [QuestionType.FILL_IN_BLANK]: "Fill in the Blank",
  [QuestionType.POLL]: "Poll (no scoring)",
  [QuestionType.RATING]: "Rating",
  [QuestionType.IMAGE]: "Image Choice",
  [QuestionType.AUDIO]: "Audio Choice",
  [QuestionType.VIDEO]: "Video Choice",
  [QuestionType.ORDERING]: "Ordering",
  [QuestionType.MATCHING]: "Matching",
  [QuestionType.HOTSPOT]: "Hotspot",
  [QuestionType.NUMERIC]: "Numeric",
  [QuestionType.OPEN_TEXT]: "Open Text (no scoring)",
};
