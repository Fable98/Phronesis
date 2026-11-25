import { z } from "zod";

export const moduleIdLessonParamsSchema = z.object({
  moduleId: z.string().uuid("Invalid module id")
});

export const lessonIdParamsSchema = z.object({
  id: z.string().uuid("Invalid lesson id")
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  content: z.string().trim().min(1, "Lesson content is required").max(50000),
  videoUrl: z.string().url().max(500).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600).default(10),
  isPublished: z.boolean().default(true)
});

export const updateLessonSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  content: z.string().trim().min(1).max(50000).optional(),
  videoUrl: z.string().url().max(500).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600).optional(),
  isPublished: z.boolean().optional()
});

export const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string().uuid()).min(1, "lessonIds must contain at least one lesson id")
});
