import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as analyticsService from "./analytics.service";

export async function platformAnalytics(_req: Request, res: Response): Promise<void> {
  const analytics = await analyticsService.getPlatformAnalytics();
  sendSuccess(res, analytics);
}

export async function instructorAnalytics(req: Request, res: Response): Promise<void> {
  const analytics = await analyticsService.getInstructorAnalytics(req.user!.id);
  sendSuccess(res, analytics);
}

export async function studentAnalytics(req: Request, res: Response): Promise<void> {
  const analytics = await analyticsService.getStudentAnalytics(req.user!.id);
  sendSuccess(res, analytics);
}
