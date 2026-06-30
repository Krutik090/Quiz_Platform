import { AuditLogModel } from "@/modules/audit/audit.model";
import { logger } from "@/lib/logger";

interface AuditLogInput {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  /** Fire-and-forget by design — an audit write failure must never block the admin action it's logging. */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await AuditLogModel.create(input);
    } catch (err) {
      logger.error({ err, action: input.action }, "Failed to write audit log entry");
    }
  },

  async list(filter: { actorId?: string; targetType?: string; action?: string }, page: number, limit: number) {
    const query: Record<string, unknown> = {};
    if (filter.actorId) query.actorId = filter.actorId;
    if (filter.targetType) query.targetType = filter.targetType;
    if (filter.action) query.action = filter.action;

    const [items, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  },
};
