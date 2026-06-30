import type { Request, Response } from "express";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { exportService } from "@/modules/analytics/export.service";
import { AppError } from "@/lib/app-error";

export const analyticsController = {
  async getEventAnalytics(req: Request, res: Response) {
    const analytics = await analyticsService.getEventAnalytics(req.params.eventId as string, req.user!.id);
    res.status(200).json({ analytics });
  },

  async exportEventAnalytics(req: Request, res: Response) {
    const analytics = await analyticsService.getEventAnalytics(req.params.eventId as string, req.user!.id);
    const format = req.params.format as string;

    if (format === "csv") {
      const csv = exportService.toCsv(analytics);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="event-${analytics.eventId}.csv"`);
      res.status(200).send(csv);
      return;
    }

    if (format === "xlsx") {
      const buffer = await exportService.toXlsx(analytics);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="event-${analytics.eventId}.xlsx"`);
      res.status(200).send(buffer);
      return;
    }

    if (format === "pdf") {
      const buffer = await exportService.toPdf(analytics);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="event-${analytics.eventId}.pdf"`);
      res.status(200).send(buffer);
      return;
    }

    throw AppError.badRequest(`Unsupported export format: ${format}`);
  },
};
