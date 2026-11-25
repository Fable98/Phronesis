import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as progressService from "./progress.service";

export async function completeLesson(req: Request, res: Response): Promise<void> {
  const result = await progressService.markLessonComplete(req.user!.id, req.params.lessonId!);
  sendSuccess(res, result);
}

export async function getCourseProgress(req: Request, res: Response): Promise<void> {
  const result = await progressService.getCourseProgressForUser(req.params.courseId!, req.user!);
  sendSuccess(res, result);
}
