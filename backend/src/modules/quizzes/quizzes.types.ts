import { z } from "zod";
import {
  createQuestionSchema,
  createQuizSchema,
  saveQuizAnswersSchema,
  submitQuizAttemptSchema,
  updateQuizSchema
} from "./quizzes.schemas";

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
export type SaveQuizAnswersInput = z.infer<typeof saveQuizAnswersSchema>;
