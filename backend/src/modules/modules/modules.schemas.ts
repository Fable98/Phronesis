import { z } from "zod";

export const courseIdModuleParamsSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});

export const moduleIdParamsSchema = z.object({
  id: z.string().uuid("Invalid module id")
});

export const createModuleSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().trim().max(2000).nullable().optional()
});

export const updateModuleSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional()
});

export const reorderModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()).min(1, "moduleIds must contain at least one module id")
});
