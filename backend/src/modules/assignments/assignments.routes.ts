import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as assignmentsController from "./assignments.controller";
import {
  assignmentIdParamsSchema,
  courseAssignmentParamsSchema,
  createAssignmentSchema,
  updateAssignmentSchema
} from "./assignments.schemas";

const router = Router();

router.get(
  "/courses/:courseId/assignments",
  authenticate,
  validate({ params: courseAssignmentParamsSchema }),
  asyncHandler(assignmentsController.listAssignments)
);

router.post(
  "/courses/:courseId/assignments",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseAssignmentParamsSchema, body: createAssignmentSchema }),
  asyncHandler(assignmentsController.createAssignment)
);

router.get(
  "/assignments/:id",
  authenticate,
  validate({ params: assignmentIdParamsSchema }),
  asyncHandler(assignmentsController.getAssignment)
);

router.patch(
  "/assignments/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: assignmentIdParamsSchema, body: updateAssignmentSchema }),
  asyncHandler(assignmentsController.updateAssignment)
);

router.delete(
  "/assignments/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: assignmentIdParamsSchema }),
  asyncHandler(assignmentsController.deleteAssignment)
);

export default router;
