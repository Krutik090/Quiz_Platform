import type { Request, Response } from "express";
import { participantService } from "@/modules/participant/participant.service";

export const participantController = {
  async join(req: Request, res: Response) {
    const result = await participantService.join(req.body);
    res.status(200).json(result);
  },

  async listForEvent(req: Request, res: Response) {
    const participants = await participantService.listForEvent(req.params.eventId as string);
    res.status(200).json({ participants });
  },
};
