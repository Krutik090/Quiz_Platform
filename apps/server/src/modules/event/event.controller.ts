import type { Request, Response } from "express";
import { eventService } from "@/modules/event/event.service";

export const eventController = {
  async create(req: Request, res: Response) {
    const event = await eventService.createFromQuiz(req.body.quizId, req.user!.id);
    res.status(201).json({ event });
  },

  async get(req: Request, res: Response) {
    const event = await eventService.getOwned(req.params.id as string, req.user!.id);
    res.status(200).json({ event });
  },

  async listForQuiz(req: Request, res: Response) {
    const events = await eventService.listForQuiz(req.params.quizId as string, req.user!.id);
    res.status(200).json({ events });
  },

  async qrCode(req: Request, res: Response) {
    const event = await eventService.getOwned(req.params.id as string, req.user!.id);
    const dataUrl = await eventService.getJoinQrCode(event.joinCode);
    res.status(200).json({ qrCodeDataUrl: dataUrl, joinCode: event.joinCode, joinUrl: `${req.protocol}://${req.get("host")}` });
  },

  async lookupByJoinCode(req: Request, res: Response) {
    const result = await eventService.getByJoinCode(req.params.joinCode as string);
    res.status(200).json(result);
  },
};
