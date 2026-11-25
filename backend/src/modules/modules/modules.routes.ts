import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as modulesController from "./modules.controller";
import {
  courseIdModuleParamsSchema,
  createModuleSchema,
  moduleIdParamsSchema,
  reorderModulesSchema,
  updateModuleSchema
} from "./modules.schemas";

const router = Router();

router.get(
  "/courses/:courseId/modules",
  optionalAuth,
  validate({ params: courseIdModuleParamsSchema }),
  asyncHandler(modulesController.listModules)
);

router.post(
  "/courses/:courseId/modules",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdModuleParamsSchema, body: createModuleSchema }),
  asyncHandler(modulesController.createModule)
);

router.patch(
  "/courses/:courseId/modules/reorder",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseIdModuleParamsSchema, body: reorderModulesSchema }),
  asyncHandler(modulesController.reorderModules)
);

router.patch(
  "/modules/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: moduleIdParamsSchema, body: updateModuleSchema }),
  asyncHandler(modulesController.updateModule)
);

router.delete(
  "/modules/:id",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: moduleIdParamsSchema }),
  asyncHandler(modulesController.deleteModule)
);

export default router;
