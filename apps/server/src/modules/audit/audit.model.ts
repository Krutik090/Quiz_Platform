import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model("AuditLog", auditLogSchema);
