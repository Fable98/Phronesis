import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";

export const SESSION_COOKIE_NAME = "phronesis_session";

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/"
  });
}

async function resolveSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          bio: true,
          isActive: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session && session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await resolveSession(req);
    if (!session) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    req.user = session.user;
    req.sessionInfo = {
      id: session.id,
      token: session.token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt
    };
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await resolveSession(req);
    if (session) {
      req.user = session.user;
      req.sessionInfo = {
        id: session.id,
        token: session.token,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt
      };
    }
    next();
  } catch (err) {
    next(err);
  }
}
