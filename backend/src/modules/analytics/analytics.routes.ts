import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { asyncHandler } from "../../utils/asyncHandler";
import * as analyticsController from "./analytics.controller";

const router = Router();

router.get(
  "/platform",
  authenticate,
  requireRole(Role.ADMIN),
  asyncHandler(analyticsController.platformAnalytics)
);

router.get(
  "/instructor",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  asyncHandler(analyticsController.instructorAnalytics)
);

router.get(
  "/student",
  authenticate,
  requireRole(Role.STUDENT),
  asyncHandler(analyticsController.studentAnalytics)
);

export default router;
