import { z } from "zod";
import { QuestionType } from "../constants/question-types";

const idSchema = z.string().min(1).max(64);
const mediaSchema = z.object({
  url: z.string().url(),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
});

const scoringSchema = z.object({
  basePoints: z.number().int().min(0).max(10000),
  speedBonus: z.boolean(),
  negativeMarkingMultiplier: z.number().min(0).max(1),
  partialCreditEnabled: z.boolean(),
});

const baseFields = {
  id: idSchema,
  prompt: z.string().trim().min(1).max(2000),
  media: mediaSchema.optional(),
  timeLimitSeconds: z.number().int().min(3).max(600),
  timerEnabled: z.boolean().default(true),
  points: z.number().int().min(0).max(10000),
  scoring: scoringSchema,
  order: z.number().int().min(0),
  required: z.boolean().default(true),
};

const choiceOptionSchema = z.object({
  id: idSchema,
  text: z.string().trim().min(1).max(500),
  mediaUrl: z.string().url().optional(),
  isCorrect: z.boolean().optional(),
});

const choiceQuestionSchema = z.object({
  ...baseFields,
  type: z.enum([QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE, QuestionType.POLL]),
  options: z.array(choiceOptionSchema).min(2).max(12),
  randomizeOptions: z.boolean().default(false),
});

const mediaOnlyQuestionSchema = z.object({
  ...baseFields,
  type: z.enum([QuestionType.IMAGE, QuestionType.AUDIO, QuestionType.VIDEO]),
  options: z.array(choiceOptionSchema).min(2).max(12),
  randomizeOptions: z.boolean().default(false),
});

const trueFalseQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.TRUE_FALSE),
  correctAnswer: z.boolean().optional(),
});

const fillInBlankQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.FILL_IN_BLANK),
  acceptedAnswers: z.array(z.string().trim().min(1).max(200)).min(1).max(20).optional(),
  caseSensitive: z.boolean().default(false),
});

const ratingQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.RATING),
  minValue: z.number().int(),
  maxValue: z.number().int(),
  step: z.number().positive().default(1),
});

const orderingItemSchema = z.object({
  id: idSchema,
  text: z.string().trim().min(1).max(300),
  correctPosition: z.number().int().min(0).optional(),
});

const orderingQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.ORDERING),
  items: z.array(orderingItemSchema).min(2).max(20),
});

const matchingPairSchema = z.object({
  id: idSchema,
  left: z.string().trim().min(1).max(300),
  right: z.string().trim().min(1).max(300),
});

const matchingQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.MATCHING),
  pairs: z.array(matchingPairSchema).min(2).max(20),
});

const hotspotRegionSchema = z.object({
  id: idSchema,
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0).max(100),
  heightPct: z.number().min(0).max(100),
  isCorrect: z.boolean().optional(),
});

const hotspotQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.HOTSPOT),
  imageUrl: z.string().url(),
  regions: z.array(hotspotRegionSchema).min(1).max(20),
});

const numericQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.NUMERIC),
  correctValue: z.number().optional(),
  tolerance: z.number().min(0).default(0),
});

const openTextQuestionSchema = z.object({
  ...baseFields,
  type: z.literal(QuestionType.OPEN_TEXT),
  maxLength: z.number().int().min(1).max(5000).default(500),
});

export const questionSchema = z
  .discriminatedUnion("type", [
    choiceQuestionSchema,
    mediaOnlyQuestionSchema,
    trueFalseQuestionSchema,
    fillInBlankQuestionSchema,
    ratingQuestionSchema,
    orderingQuestionSchema,
    matchingQuestionSchema,
    hotspotQuestionSchema,
    numericQuestionSchema,
    openTextQuestionSchema,
  ])
  // Cross-field checks can't live on an individual member schema passed to discriminatedUnion()
  // — it requires plain ZodObjects (no .refine() wrapper) — so they're applied here instead.
  .superRefine((q, ctx) => {
    if (q.type === QuestionType.RATING && q.maxValue <= q.minValue) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "maxValue must exceed minValue", path: ["maxValue"] });
    }
  });

export type QuestionInput = z.infer<typeof questionSchema>;

/** Answer payload validators keyed by question type — used to validate a participant's submission server-side. */
export const answerResponseSchemas: Record<QuestionType, z.ZodTypeAny> = {
  [QuestionType.SINGLE_CHOICE]: z.object({ optionId: idSchema }),
  [QuestionType.MULTIPLE_CHOICE]: z.object({ optionIds: z.array(idSchema).min(1).max(12) }),
  [QuestionType.POLL]: z.object({ optionId: idSchema }),
  [QuestionType.IMAGE]: z.object({ optionId: idSchema }),
  [QuestionType.AUDIO]: z.object({ optionId: idSchema }),
  [QuestionType.VIDEO]: z.object({ optionId: idSchema }),
  [QuestionType.TRUE_FALSE]: z.object({ value: z.boolean() }),
  [QuestionType.FILL_IN_BLANK]: z.object({ text: z.string().trim().min(1).max(200) }),
  [QuestionType.RATING]: z.object({ value: z.number() }),
  [QuestionType.ORDERING]: z.object({ orderedIds: z.array(idSchema).min(2).max(20) }),
  [QuestionType.MATCHING]: z.object({ pairs: z.array(z.object({ leftId: idSchema, rightId: idSchema })) }),
  [QuestionType.HOTSPOT]: z.object({ regionId: idSchema }),
  [QuestionType.NUMERIC]: z.object({ value: z.number() }),
  [QuestionType.OPEN_TEXT]: z.object({ text: z.string().trim().max(5000) }),
};
