import { Role } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as filesController from "./files.controller";
import {
  attachCourseMaterialSchema,
  courseMaterialCourseParamsSchema,
  courseMaterialDeleteParamsSchema,
  fileIdParamsSchema
} from "./files.schemas";

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 1
  }
});

const router = Router();

router.post(
  "/files",
  authenticate,
  uploadMiddleware.single("file"),
  asyncHandler(filesController.upload)
);

router.get(
  "/files/:id",
  authenticate,
  validate({ params: fileIdParamsSchema }),
  asyncHandler(filesController.streamFile)
);

router.post(
  "/courses/:courseId/materials",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseMaterialCourseParamsSchema, body: attachCourseMaterialSchema }),
  asyncHandler(filesController.attachMaterial)
);

router.delete(
  "/courses/:courseId/materials/:materialId",
  authenticate,
  requireRole(Role.INSTRUCTOR, Role.ADMIN),
  validate({ params: courseMaterialDeleteParamsSchema }),
  asyncHandler(filesController.deleteMaterial)
);

export default router;
