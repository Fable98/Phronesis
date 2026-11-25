import { CourseStatus, DifficultyLevel } from "@prisma/client";
import { z } from "zod";

export const courseIdParamsSchema = z.object({
  id: z.string().uuid("Invalid course id")
});

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel).optional(),
  status: z.nativeEnum(CourseStatus).optional(),
  sort: z
    .enum(["newest", "oldest", "title_asc", "title_desc", "popular"])
    .default("newest"),
  mine: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  scope: z.enum(["public", "admin", "instructor"]).optional()
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  category: z.string().trim().min(2).max(80),
  difficultyLevel: z.nativeEnum(DifficultyLevel).default(DifficultyLevel.BEGINNER),
  thumbnailUrl: z.string().url().max(500).nullable().optional()
});

export const updateCourseSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel).optional(),
  thumbnailUrl: z.string().url().max(500).nullable().optional()
});

export const reviewCourseSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().trim().min(3).max(1000).optional()
  })
  .superRefine((val, ctx) => {
    if (val.decision === "REJECT" && !val.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Rejection reason is required when rejecting a course"
      });
    }
  });
