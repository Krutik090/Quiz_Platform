import type { QuestionType } from "../constants/question-types";

export interface MediaAsset {
  url: string;
  /** MIME type, validated server-side against an allowlist on upload. */
  mimeType: string;
  sizeBytes: number;
}

export interface ChoiceOption {
  id: string;
  text: string;
  mediaUrl?: string;
  /** Only present in admin/server payloads — stripped before sending to participants. */
  isCorrect?: boolean;
}

export interface OrderingItem {
  id: string;
  text: string;
  /** Correct 0-based position — stripped before sending to participants. */
  correctPosition?: number;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface HotspotRegion {
  id: string;
  /** Percentage-based bounding box so it scales with any rendered image size. */
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  isCorrect?: boolean;
}

export interface ScoringConfig {
  basePoints: number;
  /** Award bonus points for faster correct answers, scaled linearly within the time limit. */
  speedBonus: boolean;
  /** Penalty multiplier applied to incorrect answers (0 = no penalty). */
  negativeMarkingMultiplier: number;
  partialCreditEnabled: boolean;
}

export interface QuestionBase {
  id: string;
  type: QuestionType;
  prompt: string;
  media?: MediaAsset;
  timeLimitSeconds: number;
  /** When false the timer is hidden and the host must advance manually. Absent means enabled. */
  timerEnabled?: boolean;
  points: number;
  scoring: ScoringConfig;
  order: number;
  required: boolean;
}

export interface ChoiceQuestion extends QuestionBase {
  type: typeof QuestionType.SINGLE_CHOICE | typeof QuestionType.MULTIPLE_CHOICE | typeof QuestionType.POLL;
  options: ChoiceOption[];
  randomizeOptions: boolean;
}

export interface TrueFalseQuestion extends QuestionBase {
  type: typeof QuestionType.TRUE_FALSE;
  correctAnswer?: boolean;
}

export interface FillInBlankQuestion extends QuestionBase {
  type: typeof QuestionType.FILL_IN_BLANK;
  acceptedAnswers?: string[];
  caseSensitive: boolean;
}

export interface RatingQuestion extends QuestionBase {
  type: typeof QuestionType.RATING;
  minValue: number;
  maxValue: number;
  step: number;
}

export interface OrderingQuestion extends QuestionBase {
  type: typeof QuestionType.ORDERING;
  items: OrderingItem[];
}

export interface MatchingQuestion extends QuestionBase {
  type: typeof QuestionType.MATCHING;
  pairs: MatchingPair[];
}

export interface HotspotQuestion extends QuestionBase {
  type: typeof QuestionType.HOTSPOT;
  imageUrl: string;
  regions: HotspotRegion[];
}

export interface NumericQuestion extends QuestionBase {
  type: typeof QuestionType.NUMERIC;
  correctValue?: number;
  tolerance: number;
}

export interface OpenTextQuestion extends QuestionBase {
  type: typeof QuestionType.OPEN_TEXT;
  maxLength: number;
}

export interface MediaOnlyQuestion extends QuestionBase {
  type: typeof QuestionType.IMAGE | typeof QuestionType.AUDIO | typeof QuestionType.VIDEO;
  options: ChoiceOption[];
  randomizeOptions: boolean;
}

export type Question =
  | ChoiceQuestion
  | TrueFalseQuestion
  | FillInBlankQuestion
  | RatingQuestion
  | OrderingQuestion
  | MatchingQuestion
  | HotspotQuestion
  | NumericQuestion
  | OpenTextQuestion
  | MediaOnlyQuestion;

/**
 * Plain `Omit` over a union only removes keys common to *every* member (an intersection of
 * `keyof`), so it silently drops type-specific fields like `imageUrl` or `minValue`. This
 * distributes the Omit across each union member individually instead.
 */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/**
 * Question payload sent to participants — answer keys are stripped at runtime by
 * toPublicQuestion(). The correctness flags inside options/items/regions are left in the
 * type (rather than re-mapped) since the client never reads them once stripped.
 */
export type PublicQuestion = DistributiveOmit<Question, "correctAnswer" | "correctValue" | "acceptedAnswers">;

export interface QuizTheme {
  primaryColor: string;
  logoUrl?: string;
  backgroundUrl?: string;
}

export interface QuizSettings {
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showLeaderboardAfterEachQuestion: boolean;
  leaderboardDurationSeconds: number;
  allowLateJoin: boolean;
  defaultTimeLimitSeconds: number;
  theme: QuizTheme;
}

export const QuizStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  status: QuizStatus;
  questions: Question[];
  settings: QuizSettings;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
