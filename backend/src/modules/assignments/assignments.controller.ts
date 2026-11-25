import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as assignmentsService from "./assignments.service";

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const assignments = await assignmentsService.listCourseAssignments(
    req.params.courseId!,
    req.user!
  );
  sendSuccess(res, { assignments });
}

export async function getAssignment(req: Request, res: Response): Promise<void> {
  const result = await assignmentsService.getAssignmentById(req.params.id!, req.user!);
  sendSuccess(res, result);
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await assignmentsService.createAssignment(
    req.params.courseId!,
    req.user!,
    req.body
  );
  sendSuccess(res, { assignment }, 201);
}

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await assignmentsService.updateAssignment(
    req.params.id!,
    req.user!,
    req.body
  );
  sendSuccess(res, { assignment });
}

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  await assignmentsService.deleteAssignment(req.params.id!, req.user!);
  sendSuccess(res, { deleted: true });
}
