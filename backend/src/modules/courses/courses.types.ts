import { CourseStatus } from "@prisma/client";
import { z } from "zod";
import {
  createCourseSchema,
  listCoursesQuerySchema,
  reviewCourseSchema,
  updateCourseSchema
} from "./courses.schemas";

export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ReviewCourseInput = z.infer<typeof reviewCourseSchema>;

export const COURSE_TRANSITIONS: Record<CourseStatus, readonly CourseStatus[]> = {
  [CourseStatus.DRAFT]: [CourseStatus.PENDING, CourseStatus.ARCHIVED],
  [CourseStatus.PENDING]: [CourseStatus.PUBLISHED, CourseStatus.REJECTED, CourseStatus.ARCHIVED],
  [CourseStatus.PUBLISHED]: [CourseStatus.ARCHIVED],
  [CourseStatus.REJECTED]: [CourseStatus.DRAFT, CourseStatus.ARCHIVED],
  [CourseStatus.ARCHIVED]: []
};
