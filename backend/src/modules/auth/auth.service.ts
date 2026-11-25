import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { generateCsrfToken } from "../../middleware/csrf";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../utils/errors";
import { hashPassword, verifyPassword } from "../../utils/password";
import { AuthSessionResult, LoginInput, RegisterInput, SafeUser, UpdateMeInput } from "./auth.types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    bio: user.bio,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

export async function registerStudent(input: RegisterInput): Promise<AuthSessionResult> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      bio: input.bio ?? null,
      role: Role.STUDENT,
      sessions: {
        create: {
          token: sessionToken,
          csrfToken,
          expiresAt
        }
      }
    }
  });

  return {
    user: toSafeUser(user),
    sessionToken,
    csrfToken,
    expiresAt
  };
}

export async function loginUser(
  input: LoginInput,
  existingSessionToken?: string
): Promise<AuthSessionResult> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.isActive) {
    throw new UnauthorizedError("This account has been deactivated");
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction(async (tx) => {
    // Rotate session: remove old session if present
    if (existingSessionToken) {
      await tx.session.deleteMany({ where: { token: existingSessionToken } });
    }
    await tx.session.create({
      data: {
        token: sessionToken,
        csrfToken,
        userId: user.id,
        expiresAt
      }
    });
  });

  return {
    user: toSafeUser(user),
    sessionToken,
    csrfToken,
    expiresAt
  };
}

export async function logoutSession(sessionToken: string | undefined): Promise<void> {
  if (!sessionToken) {
    return;
  }
  await prisma.session.deleteMany({ where: { token: sessionToken } });
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return toSafeUser(user);
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<SafeUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {})
    }
  });
  return toSafeUser(user);
}
