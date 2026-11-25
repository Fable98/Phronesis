import { z } from "zod";
import {
  createModuleSchema,
  reorderModulesSchema,
  updateModuleSchema
} from "./modules.schemas";

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;
