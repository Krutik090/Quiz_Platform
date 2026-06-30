import type { Request, Response } from "express";
import { quizService } from "@/modules/quiz/quiz.service";

export const quizController = {
  async create(req: Request, res: Response) {
    const quiz = await quizService.create(req.user!.id, req.body);
    res.status(201).json({ quiz });
  },

  async get(req: Request, res: Response) {
    const quiz = await quizService.getOwned(req.params.id as string, req.user!.id);
    res.status(200).json({ quiz });
  },

  async list(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const status = req.query.status as never;
    const result = await quizService.list(req.user!.id, page, limit, status);
    res.status(200).json(result);
  },

  async update(req: Request, res: Response) {
    const quiz = await quizService.update(req.params.id as string, req.user!.id, req.body);
    res.status(200).json({ quiz });
  },

  async replaceQuestions(req: Request, res: Response) {
    const quiz = await quizService.replaceQuestions(req.params.id as string, req.user!.id, req.body.questions);
    res.status(200).json({ quiz });
  },

  async publish(req: Request, res: Response) {
    const quiz = await quizService.publish(req.params.id as string, req.user!.id);
    res.status(200).json({ quiz });
  },

  async remove(req: Request, res: Response) {
    await quizService.remove(req.params.id as string, req.user!.id);
    res.status(204).send();
  },
};
