export const QuestionType = {
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  TRUE_FALSE: "true_false",
  FILL_IN_BLANK: "fill_in_blank",
  POLL: "poll",
  RATING: "rating",
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  ORDERING: "ordering",
  MATCHING: "matching",
  HOTSPOT: "hotspot",
  NUMERIC: "numeric",
  OPEN_TEXT: "open_text",
} as const;

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

/** Question types that are scored automatically with a deterministic correct answer. */
export const AUTO_SCORED_TYPES: ReadonlySet<QuestionType> = new Set([
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_IN_BLANK,
  QuestionType.ORDERING,
  QuestionType.MATCHING,
  QuestionType.HOTSPOT,
  QuestionType.NUMERIC,
  QuestionType.IMAGE,
  QuestionType.AUDIO,
  QuestionType.VIDEO,
]);

/** Question types with no right/wrong answer — no points awarded, used for engagement/feedback. */
export const UNSCORED_TYPES: ReadonlySet<QuestionType> = new Set([
  QuestionType.POLL,
  QuestionType.RATING,
  QuestionType.OPEN_TEXT,
]);
