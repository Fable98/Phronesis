import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as usersController from "./users.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserSchema,
  userIdParamsSchema
} from "./users.schemas";

const router = Router();

router.use(authenticate, requireRole(Role.ADMIN));

router.get("/", validate({ query: listUsersQuerySchema }), asyncHandler(usersController.listUsers));
router.post("/", validate({ body: createUserSchema }), asyncHandler(usersController.createUser));
router.get("/:id", validate({ params: userIdParamsSchema }), asyncHandler(usersController.getUser));
router.patch(
  "/:id",
  validate({ params: userIdParamsSchema, body: updateUserSchema }),
  asyncHandler(usersController.updateUser)
);
router.patch(
  "/:id/role",
  validate({ params: userIdParamsSchema, body: updateUserRoleSchema }),
  asyncHandler(usersController.updateUserRole)
);
router.delete(
  "/:id",
  validate({ params: userIdParamsSchema }),
  asyncHandler(usersController.deleteUser)
);

export default router;
