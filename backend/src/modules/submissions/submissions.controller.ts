import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as submissionsService from "./submissions.service";

export async function createSubmission(req: Request, res: Response): Promise<void> {
  const submission = await submissionsService.createSubmission(
    req.params.assignmentId!,
    req.user!.id,
    req.body
  );
  sendSuccess(res, { submission }, 201);
}

export async function listForAssignment(req: Request, res: Response): Promise<void> {
  const submissions = await submissionsService.listSubmissionsForAssignment(
    req.params.assignmentId!,
    req.user!
  );
  sendSuccess(res, { submissions });
}

export async function listMySubmissions(req: Request, res: Response): Promise<void> {
  const submissions = await submissionsService.listMySubmissions(req.user!.id);
  sendSuccess(res, { submissions });
}

export async function listInstructorSubmissions(req: Request, res: Response): Promise<void> {
  const submissions = await submissionsService.listInstructorSubmissions(req.user!.id);
  sendSuccess(res, { submissions });
}

export async function gradeSubmission(req: Request, res: Response): Promise<void> {
  const submission = await submissionsService.gradeSubmission(
    req.params.id!,
    req.user!.id,
    req.body
  );
  sendSuccess(res, { submission });
}
