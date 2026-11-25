import { Role } from "@prisma/client";
import { z } from "zod";

export const userIdParamsSchema = z.object({
  id: z.string().uuid("Invalid user id")
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  search: z.string().trim().max(100).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
});

export const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(100),
  role: z.nativeEnum(Role),
  bio: z.string().trim().max(500).optional()
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional()
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role)
});
