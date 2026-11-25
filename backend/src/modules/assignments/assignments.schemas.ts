import { z } from "zod";

export const courseAssignmentParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});

export const assignmentIdParamsSchema = z.object({
  id: z.string().uuid("Invalid assignment id")
});

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(5000),
  dueDate: z.string().datetime().nullable().optional(),
  maxScore: z.coerce.number().int().min(1).max(1000).default(100),
  allowResubmission: z.boolean().default(false),
  maxResubmissions: z.coerce.number().int().min(0).max(20).default(0),
  allowLateSubmission: z.boolean().default(false),
  isPublished: z.boolean().default(true)
});

export const updateAssignmentSchema = createAssignmentSchema.partial();
