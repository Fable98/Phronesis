import { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  isActive: boolean;
}

export interface SessionInfo {
  id: string;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionInfo?: SessionInfo;
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export {};
