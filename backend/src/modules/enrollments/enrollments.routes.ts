import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as enrollmentsController from "./enrollments.controller";
import {
  createEnrollmentSchema,
  enrollmentIdParamsSchema,
  listEnrollmentsQuerySchema
} from "./enrollments.schemas";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ body: createEnrollmentSchema }),
  asyncHandler(enrollmentsController.enroll)
);

router.get(
  "/my",
  authenticate,
  requireRole(Role.STUDENT),
  asyncHandler(enrollmentsController.myEnrollments)
);

router.get(
  "/",
  authenticate,
  requireRole(Role.ADMIN),
  validate({ query: listEnrollmentsQuerySchema }),
  asyncHandler(enrollmentsController.listAll)
);

router.patch(
  "/:id/drop",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: enrollmentIdParamsSchema }),
  asyncHandler(enrollmentsController.drop)
);

export default router;
