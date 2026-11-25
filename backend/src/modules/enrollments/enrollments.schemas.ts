import { EnrollmentStatus } from "@prisma/client";
import { z } from "zod";

export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid("Invalid course id")
});

export const enrollmentIdParamsSchema = z.object({
  id: z.string().uuid("Invalid enrollment id")
});

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(EnrollmentStatus).optional(),
  courseId: z.string().uuid().optional()
});
