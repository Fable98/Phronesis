import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as quizzesController from "./quizzes.controller";
import {
  attemptIdParamsSchema,
  courseQuizParamsSchema,
  createQuestionSchema,
  createQuizSchema,
  questionIdParamsSchema,
  quizIdParamsSchema,
  saveQuizAnswersSchema,
  submitQuizAttemptSchema,
  updateQuizSchema
} from "./quizzes.schemas";

const router = Router();

router.get(
  "/courses/:courseId/quizzes",
  authenticate,
  validate({ params: courseQuizParamsSchema }),
  asyncHandler(quizzesController.listQuizzes)
);

router.post(
  "/courses/:courseId/quizzes",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseQuizParamsSchema, body: createQuizSchema }),
  asyncHandler(quizzesController.createQuiz)
);

router.get(
  "/quizzes/:id",
  authenticate,
  validate({ params: quizIdParamsSchema }),
  asyncHandler(quizzesController.getQuiz)
);

router.patch(
  "/quizzes/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: quizIdParamsSchema, body: updateQuizSchema }),
  asyncHandler(quizzesController.updateQuiz)
);

router.delete(
  "/quizzes/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: quizIdParamsSchema }),
  asyncHandler(quizzesController.deleteQuiz)
);

router.post(
  "/quizzes/:id/questions",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: quizIdParamsSchema, body: createQuestionSchema }),
  asyncHandler(quizzesController.addQuestion)
);

router.delete(
  "/questions/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: questionIdParamsSchema }),
  asyncHandler(quizzesController.deleteQuestion)
);

router.post(
  "/quizzes/:id/attempts",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: quizIdParamsSchema }),
  asyncHandler(quizzesController.startAttempt)
);

router.put(
  "/attempts/:id/answers",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: attemptIdParamsSchema, body: saveQuizAnswersSchema }),
  asyncHandler(quizzesController.saveAnswers)
);

router.post(
  "/attempts/:id/submit",
  authenticate,
  requireRole(Role.STUDENT),
  validate({ params: attemptIdParamsSchema, body: submitQuizAttemptSchema }),
  asyncHandler(quizzesController.submitAttempt)
);

router.get(
  "/attempts/:id/result",
  authenticate,
  validate({ params: attemptIdParamsSchema }),
  asyncHandler(quizzesController.getAttemptResult)
);

router.get(
  "/attempts/my",
  authenticate,
  requireRole(Role.STUDENT),
  asyncHandler(quizzesController.listMyAttempts)
);

export default router;
