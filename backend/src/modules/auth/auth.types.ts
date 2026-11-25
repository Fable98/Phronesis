import { Role } from "@prisma/client";
import { z } from "zod";
import { loginSchema, registerSchema, updateMeSchema } from "./auth.schemas";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthSessionResult {
  user: SafeUser;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}
