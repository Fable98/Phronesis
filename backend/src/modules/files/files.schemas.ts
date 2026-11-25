import { z } from "zod";

export const fileIdParamsSchema = z.object({
  id: z.string().uuid("Invalid file id")
});

export const courseMaterialCourseParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});

export const courseMaterialDeleteParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id"),
  materialId: z.string().uuid("Invalid material id")
});

export const attachCourseMaterialSchema = z.object({
  title: z.string().trim().min(2).max(160),
  fileId: z.string().uuid("Invalid file id")
});
