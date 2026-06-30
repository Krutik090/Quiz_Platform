import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { AVATAR_OPTIONS } from "@tribastion/shared";

const participantSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    username: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    avatar: { type: String, enum: AVATAR_OPTIONS, required: true },
    totalScore: { type: Number, default: 0 },
    cumulativeResponseTimeMs: { type: Number, default: 0 },
    isConnected: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

participantSchema.index({ eventId: 1, email: 1 }, { unique: true });

export type ParticipantDocument = HydratedDocument<InferSchemaType<typeof participantSchema>>;

export const ParticipantModel = model("Participant", participantSchema);
