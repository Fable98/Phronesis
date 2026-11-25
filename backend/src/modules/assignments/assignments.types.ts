import { z } from "zod";
import { createAssignmentSchema, updateAssignmentSchema } from "./assignments.schemas";

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
