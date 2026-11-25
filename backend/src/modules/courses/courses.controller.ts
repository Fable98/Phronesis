import { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as coursesService from "./courses.service";
import { ListCoursesQuery } from "./courses.types";

export async function listCourses(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListCoursesQuery;
  const { courses, meta } = await coursesService.listCourses(query, req.user);
  sendSuccess(res, { courses }, 200, meta);
}

export async function getCourse(req: Request, res: Response): Promise<void> {
  const result = await coursesService.getCourseById(req.params.id!, req.user);
  sendSuccess(res, result);
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  const course = await coursesService.createCourse(req.user!.id, req.body);
  sendSuccess(res, { course }, 201);
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const course = await coursesService.updateCourse(req.params.id!, req.user!, req.body);
  sendSuccess(res, { course });
}

export async function submitCourse(req: Request, res: Response): Promise<void> {
  const course = await coursesService.submitCourseForReview(req.params.id!, req.user!);
  sendSuccess(res, { course });
}

export async function reviewCourse(req: Request, res: Response): Promise<void> {
  const course = await coursesService.reviewCourse(req.params.id!, req.body);
  sendSuccess(res, { course });
}

export async function archiveCourse(req: Request, res: Response): Promise<void> {
  const course = await coursesService.archiveCourse(req.params.id!, req.user!);
  sendSuccess(res, { course });
}

export async function deleteCourse(req: Request, res: Response): Promise<void> {
  const result = await coursesService.deleteOrArchiveCourse(req.params.id!, req.user!);
  sendSuccess(res, result);
}

export async function listCourseStudents(req: Request, res: Response): Promise<void> {
  const result = await coursesService.listCourseStudents(req.params.id!, req.user!);
  sendSuccess(res, result);
}
