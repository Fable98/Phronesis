import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as coursesController from "./courses.controller";
import {
  courseIdParamsSchema,
  createCourseSchema,
  listCoursesQuerySchema,
  reviewCourseSchema,
  updateCourseSchema
} from "./courses.schemas";

const router = Router();

router.get(
  "/",
  optionalAuth,
  validate({ query: listCoursesQuerySchema }),
  asyncHandler(coursesController.listCourses)
);

router.get(
  "/:id",
  optionalAuth,
  validate({ params: courseIdParamsSchema }),
  asyncHandler(coursesController.getCourse)
);

router.post(
  "/",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ body: createCourseSchema }),
  asyncHandler(coursesController.createCourse)
);

router.patch(
  "/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdParamsSchema, body: updateCourseSchema }),
  asyncHandler(coursesController.updateCourse)
);

router.post(
  "/:id/submit",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(coursesController.submitCourse)
);

router.patch(
  "/:id/review",
  authenticate,
  requireRole(Role.ADMIN),
  validate({ params: courseIdParamsSchema, body: reviewCourseSchema }),
  asyncHandler(coursesController.reviewCourse)
);

router.post(
  "/:id/archive",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(coursesController.archiveCourse)
);

router.delete(
  "/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(coursesController.deleteCourse)
);

router.get(
  "/:id/students",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(coursesController.listCourseStudents)
);

export default router;
