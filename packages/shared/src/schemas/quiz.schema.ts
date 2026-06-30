import { z } from "zod";
import { QuizStatus } from "../types/quiz.types";
import { questionSchema } from "./question.schema";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color");

const quizThemeSchema = z.object({
  primaryColor: hexColor.default("#EC008C"),
  logoUrl: z.string().url().optional(),
  backgroundUrl: z.string().url().optional(),
});

const quizSettingsSchema = z.object({
  randomizeQuestions: z.boolean().default(false),
  randomizeAnswers: z.boolean().default(false),
  showLeaderboardAfterEachQuestion: z.boolean().default(true),
  leaderboardDurationSeconds: z.number().int().min(0).max(120).default(8),
  allowLateJoin: z.boolean().default(false),
  defaultTimeLimitSeconds: z.number().int().min(3).max(600).default(20),
  theme: quizThemeSchema.default({ primaryColor: "#EC008C" }),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  settings: quizSettingsSchema.default({}),
});

export const updateQuizSchema = createQuizSchema.partial().extend({
  status: z.nativeEnum(QuizStatus).optional(),
});

export const replaceQuestionsSchema = z.object({
  questions: z.array(questionSchema).min(1).max(200),
});

/** Input (pre-parse) shapes — what callers send. Fields with Zod defaults are optional here. */
export type CreateQuizInput = z.input<typeof createQuizSchema>;
export type UpdateQuizInput = z.input<typeof updateQuizSchema>;
