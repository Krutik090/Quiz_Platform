import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { EventStatus } from "@tribastion/shared";

const quizEventSchema = new Schema(
  {
    quizId: { type: String, required: true, index: true },
    hostId: { type: String, required: true, index: true },
    joinCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: Object.values(EventStatus), default: EventStatus.LOBBY, required: true },
    currentQuestionIndex: { type: Number, default: -1 },
    questionOrder: { type: [String], default: [] },
    /** Snapshot of the quiz at start time so later edits to the quiz never alter a past event's questions. */
    questionsSnapshot: { type: [Schema.Types.Mixed], default: [] },
    settingsSnapshot: { type: Schema.Types.Mixed },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

export type QuizEventDocument = HydratedDocument<InferSchemaType<typeof quizEventSchema>>;

export const QuizEventModel = model("QuizEvent", quizEventSchema);
