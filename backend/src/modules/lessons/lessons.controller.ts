import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as lessonsService from "./lessons.service";

export async function listLessons(req: Request, res: Response): Promise<void> {
  const lessons = await lessonsService.listModuleLessons(req.params.moduleId!, req.user);
  sendSuccess(res, { lessons });
}

export async function getLesson(req: Request, res: Response): Promise<void> {
  const result = await lessonsService.getLessonById(req.params.id!, req.user!);
  sendSuccess(res, result);
}

export async function createLesson(req: Request, res: Response): Promise<void> {
  const lesson = await lessonsService.createLesson(req.params.moduleId!, req.user!, req.body);
  sendSuccess(res, { lesson }, 201);
}

export async function updateLesson(req: Request, res: Response): Promise<void> {
  const lesson = await lessonsService.updateLesson(req.params.id!, req.user!, req.body);
  sendSuccess(res, { lesson });
}

export async function reorderLessons(req: Request, res: Response): Promise<void> {
  const lessons = await lessonsService.reorderLessons(
    req.params.moduleId!,
    req.user!,
    req.body.lessonIds
  );
  sendSuccess(res, { lessons });
}

export async function deleteLesson(req: Request, res: Response): Promise<void> {
  await lessonsService.deleteLesson(req.params.id!, req.user!);
  sendSuccess(res, { deleted: true });
}
