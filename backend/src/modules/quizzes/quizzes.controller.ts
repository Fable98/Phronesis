import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as quizzesService from "./quizzes.service";

export async function listQuizzes(req: Request, res: Response): Promise<void> {
  const quizzes = await quizzesService.listCourseQuizzes(req.params.courseId!, req.user!);
  sendSuccess(res, { quizzes });
}

export async function getQuiz(req: Request, res: Response): Promise<void> {
  const result = await quizzesService.getQuizById(req.params.id!, req.user!);
  sendSuccess(res, result);
}

export async function createQuiz(req: Request, res: Response): Promise<void> {
  const quiz = await quizzesService.createQuiz(req.params.courseId!, req.user!, req.body);
  sendSuccess(res, { quiz }, 201);
}

export async function updateQuiz(req: Request, res: Response): Promise<void> {
  const quiz = await quizzesService.updateQuiz(req.params.id!, req.user!, req.body);
  sendSuccess(res, { quiz });
}

export async function deleteQuiz(req: Request, res: Response): Promise<void> {
  await quizzesService.deleteQuiz(req.params.id!, req.user!);
  sendSuccess(res, { deleted: true });
}

export async function addQuestion(req: Request, res: Response): Promise<void> {
  const question = await quizzesService.addQuestion(req.params.id!, req.user!, req.body);
  sendSuccess(res, { question }, 201);
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  await quizzesService.deleteQuestion(req.params.id!, req.user!);
  sendSuccess(res, { deleted: true });
}

export async function startAttempt(req: Request, res: Response): Promise<void> {
  const result = await quizzesService.startAttempt(req.params.id!, req.user!.id);
  sendSuccess(res, result, 201);
}

export async function saveAnswers(req: Request, res: Response): Promise<void> {
  const result = await quizzesService.saveAnswers(req.params.id!, req.user!.id, req.body);
  sendSuccess(res, result);
}

export async function submitAttempt(req: Request, res: Response): Promise<void> {
  const result = await quizzesService.submitAttempt(req.params.id!, req.user!.id, req.body);
  sendSuccess(res, result);
}

export async function getAttemptResult(req: Request, res: Response): Promise<void> {
  const result = await quizzesService.getAttemptResult(req.params.id!, req.user!);
  sendSuccess(res, result);
}

export async function listMyAttempts(req: Request, res: Response): Promise<void> {
  const attempts = await quizzesService.listMyQuizAttempts(req.user!.id);
  sendSuccess(res, { attempts });
}
