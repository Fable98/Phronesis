import { z } from "zod";
import { createLessonSchema, reorderLessonsSchema, updateLessonSchema } from "./lessons.schemas";

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
