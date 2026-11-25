import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as enrollmentsService from "./enrollments.service";
import { ListEnrollmentsQuery } from "./enrollments.types";

export async function enroll(req: Request, res: Response): Promise<void> {
  const enrollment = await enrollmentsService.enrollInCourse(req.user!.id, req.body.courseId);
  sendSuccess(res, { enrollment }, 201);
}

export async function myEnrollments(req: Request, res: Response): Promise<void> {
  const result = await enrollmentsService.listMyEnrollments(req.user!.id);
  sendSuccess(res, result);
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListEnrollmentsQuery;
  const { enrollments, meta } = await enrollmentsService.listAllEnrollments(query);
  sendSuccess(res, { enrollments }, 200, meta);
}

export async function drop(req: Request, res: Response): Promise<void> {
  const enrollment = await enrollmentsService.dropEnrollment(req.params.id!, req.user!.id);
  sendSuccess(res, { enrollment });
}
