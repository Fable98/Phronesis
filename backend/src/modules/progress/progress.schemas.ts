import { z } from "zod";

export const lessonProgressParamsSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson id")
});

export const courseProgressParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});
