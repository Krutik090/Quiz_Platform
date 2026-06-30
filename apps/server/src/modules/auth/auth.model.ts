import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { Role } from "@tribastion/shared";

const adminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), default: Role.VIEWER, required: true },
    isActive: { type: Boolean, default: true },
    avatarUrl: { type: String },

    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },

    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true },
);

export type AdminUserDocument = HydratedDocument<InferSchemaType<typeof adminUserSchema>>;

export const AdminUserModel = model("AdminUser", adminUserSchema);
