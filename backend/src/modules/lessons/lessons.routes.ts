import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as lessonsController from "./lessons.controller";
import {
  createLessonSchema,
  lessonIdParamsSchema,
  moduleIdLessonParamsSchema,
  reorderLessonsSchema,
  updateLessonSchema
} from "./lessons.schemas";

const router = Router();

router.get(
  "/modules/:moduleId/lessons",
  optionalAuth,
  validate({ params: moduleIdLessonParamsSchema }),
  asyncHandler(lessonsController.listLessons)
);

router.post(
  "/modules/:moduleId/lessons",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: moduleIdLessonParamsSchema, body: createLessonSchema }),
  asyncHandler(lessonsController.createLesson)
);

router.patch(
  "/modules/:moduleId/lessons/reorder",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: moduleIdLessonParamsSchema, body: reorderLessonsSchema }),
  asyncHandler(lessonsController.reorderLessons)
);

router.get(
  "/lessons/:id",
  authenticate,
  validate({ params: lessonIdParamsSchema }),
  asyncHandler(lessonsController.getLesson)
);

router.patch(
  "/lessons/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: lessonIdParamsSchema, body: updateLessonSchema }),
  asyncHandler(lessonsController.updateLesson)
);

router.delete(
  "/lessons/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: lessonIdParamsSchema }),
  asyncHandler(lessonsController.deleteLesson)
);

export default router;
