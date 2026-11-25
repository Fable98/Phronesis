import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as submissionsController from "./submissions.controller";
import {
  assignmentSubmissionParamsSchema,
  createSubmissionSchema,
  gradeSubmissionSchema,
  submissionIdParamsSchema
} from "./submissions.schemas";

const router = Router();

router.post(
  "/assignments/:assignmentId/submissions",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: assignmentSubmissionParamsSchema, body: createSubmissionSchema }),
  asyncHandler(submissionsController.createSubmission)
);

router.get(
  "/assignments/:assignmentId/submissions",
  authenticate,
  validate({ params: assignmentSubmissionParamsSchema }),
  asyncHandler(submissionsController.listForAssignment)
);

router.get(
  "/submissions/my",
  authenticate,
  requireRole(Role.STUDENT),
  asyncHandler(submissionsController.listMySubmissions)
);

router.get(
  "/submissions/instructor",
  authenticate,
  requireRole(Role.INSTRUCTOR),
  asyncHandler(submissionsController.listInstructorSubmissions)
);

router.patch(
  "/submissions/:id/grade",
  authenticate,
  requireRole(Role.INSTRUCTOR),
  validate({ params: submissionIdParamsSchema, body: gradeSubmissionSchema }),
  asyncHandler(submissionsController.gradeSubmission)
);

export default router;
