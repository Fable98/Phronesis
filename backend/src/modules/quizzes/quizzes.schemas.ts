import { QuestionType } from "@prisma/client";
import { z } from "zod";

export const courseQuizParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});

export const quizIdParamsSchema = z.object({
  id: z.string().uuid("Invalid quiz id")
});

export const questionIdParamsSchema = z.object({
  id: z.string().uuid("Invalid question id")
});

export const attemptIdParamsSchema = z.object({
  id: z.string().uuid("Invalid attempt id")
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  timeLimitMinutes: z.coerce.number().int().min(1).max(300).default(30),
  passingScore: z.coerce.number().int().min(0).default(1),
  maxAttempts: z.coerce.number().int().min(1).max(20).default(3),
  isPublished: z.boolean().default(true)
});

export const updateQuizSchema = createQuizSchema.partial();

export const createQuestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(2000),
    type: z.nativeEnum(QuestionType).default(QuestionType.MULTIPLE_CHOICE),
    points: z.coerce.number().int().min(1).max(100).default(1),
    options: z
      .array(
        z.object({
          text: z.string().trim().min(1).max(500),
          isCorrect: z.boolean()
        })
      )
      .min(2, "At least 2 options are required")
      .max(10)
  })
  .superRefine((val, ctx) => {
    const correctCount = val.options.filter((o) => o.isCorrect).length;
    if (correctCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "At least one option must be marked as correct"
      });
    }
  });

export const submitQuizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid()
      })
    )
    .default([])
});

export const saveQuizAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid()
      })
    )
    .min(1)
});
