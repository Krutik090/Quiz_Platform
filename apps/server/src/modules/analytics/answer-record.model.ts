import { Schema, model } from "mongoose";

/**
 * Durable, per-participant answer log. Live scoring runs off Redis for speed, but Redis
 * keys expire — this collection is the permanent record analytics/reporting query against.
 */
const answerRecordSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    participantId: { type: String, required: true, index: true },
    isCorrect: { type: Boolean, required: true },
    pointsAwarded: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true },
    response: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

answerRecordSchema.index({ eventId: 1, questionId: 1 });

export const AnswerRecordModel = model("AnswerRecord", answerRecordSchema);
