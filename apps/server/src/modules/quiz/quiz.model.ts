import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { QuizStatus } from "@tribastion/shared";

/**
 * Questions are heterogeneous across 14 types (see @tribastion/shared Question union).
 * Zod fully validates shape at the API boundary (quiz.schema.ts / question.schema.ts),
 * so Mongoose only needs to persist them — it stores each question as Mixed rather than
 * re-declaring ten near-identical subdocument schemas.
 */
const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
  },
  { strict: false, _id: false },
);

const quizThemeSchema = new Schema(
  {
    primaryColor: { type: String, default: "#EC008C" },
    logoUrl: { type: String },
    backgroundUrl: { type: String },
  },
  { _id: false },
);

const quizSettingsSchema = new Schema(
  {
    randomizeQuestions: { type: Boolean, default: false },
    randomizeAnswers: { type: Boolean, default: false },
    showLeaderboardAfterEachQuestion: { type: Boolean, default: true },
    leaderboardDurationSeconds: { type: Number, default: 8 },
    allowLateJoin: { type: Boolean, default: false },
    defaultTimeLimitSeconds: { type: Number, default: 20 },
    theme: { type: quizThemeSchema, default: () => ({}) },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    ownerId: { type: String, required: true, index: true },
    status: { type: String, enum: Object.values(QuizStatus), default: QuizStatus.DRAFT },
    questions: { type: [questionSchema], default: [] },
    settings: { type: quizSettingsSchema, default: () => ({}) },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

quizSchema.index({ ownerId: 1, status: 1 });
quizSchema.index({ title: "text", description: "text" });

export type QuizDocument = HydratedDocument<InferSchemaType<typeof quizSchema>>;

export const QuizModel = model("Quiz", quizSchema);
