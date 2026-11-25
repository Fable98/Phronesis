import { z } from "zod";

export const assignmentSubmissionParamsSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment id")
});

export const submissionIdParamsSchema = z.object({
  id: z.string().uuid("Invalid submission id")
});

export const createSubmissionSchema = z
  .object({
    content: z.string().trim().min(1).max(20000).optional(),
    fileId: z.string().uuid("Invalid file id").optional()
  })
  .superRefine((val, ctx) => {
    if (!val.content && !val.fileId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide submission text content or attach a file"
      });
    }
  });

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().int().min(0, "Score must be >= 0"),
  feedback: z.string().trim().max(5000).nullable().optional()
});
