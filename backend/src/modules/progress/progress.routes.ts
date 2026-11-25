import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as progressController from "./progress.controller";
import { courseProgressParamsSchema, lessonProgressParamsSchema } from "./progress.schemas";

const router = Router();

router.post(
  "/lessons/:lessonId/complete",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: lessonProgressParamsSchema }),
  asyncHandler(progressController.completeLesson)
);

router.get(
  "/courses/:courseId/progress",
  authenticate,
  validate({ params: courseProgressParamsSchema }),
  asyncHandler(progressController.getCourseProgress)
);

export default router;
