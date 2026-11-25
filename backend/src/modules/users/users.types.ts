import { Role } from "@prisma/client";
import { z } from "zod";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserSchema
} from "./users.schemas";

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
