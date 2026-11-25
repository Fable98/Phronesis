import { Request, Response } from "express";
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from "../../middleware/auth";
import { CSRF_COOKIE_NAME, generateCsrfToken, setCsrfCookie } from "../../middleware/csrf";
import { sendSuccess } from "../../utils/response";
import * as authService from "./auth.service";

export async function getCsrf(req: Request, res: Response): Promise<void> {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfToken = typeof existing === "string" && existing.length >= 32 ? existing : generateCsrfToken();
  setCsrfCookie(res, csrfToken);
  sendSuccess(res, { csrfToken });
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.registerStudent(req.body);
  setSessionCookie(res, result.sessionToken, result.expiresAt);
  setCsrfCookie(res, result.csrfToken);
  sendSuccess(res, { user: result.user, csrfToken: result.csrfToken }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const existingToken = req.cookies?.[SESSION_COOKIE_NAME];
  const result = await authService.loginUser(
    req.body,
    typeof existingToken === "string" ? existingToken : undefined
  );
  setSessionCookie(res, result.sessionToken, result.expiresAt);
  setCsrfCookie(res, result.csrfToken);
  sendSuccess(res, { user: result.user, csrfToken: result.csrfToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  await authService.logoutSession(typeof token === "string" ? token : undefined);
  clearSessionCookie(res);
  const freshCsrf = generateCsrfToken();
  setCsrfCookie(res, freshCsrf);
  sendSuccess(res, { loggedOut: true, csrfToken: freshCsrf });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.id);
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfToken = typeof existing === "string" && existing.length >= 32 ? existing : req.sessionInfo!.csrfToken;
  setCsrfCookie(res, csrfToken);
  sendSuccess(res, { user, csrfToken });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const user = await authService.updateMe(req.user!.id, req.body);
  sendSuccess(res, { user });
}
