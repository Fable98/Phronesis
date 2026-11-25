import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/response";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, "VALIDATION_ERROR", "Validation failed", err.flatten().fieldErrors);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File exceeds maximum allowed size of ${env.MAX_FILE_SIZE_BYTES} bytes`
        : err.message;
    sendError(res, 400, "UPLOAD_ERROR", message);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, 409, "CONFLICT", "A record with this unique value already exists");
      return;
    }
    if (err.code === "P2025") {
      sendError(res, 404, "NOT_FOUND", "Requested record was not found");
      return;
    }
    if (err.code === "P2003") {
      sendError(res, 400, "BAD_REQUEST", "Invalid foreign key reference");
      return;
    }
  }

  if (env.NODE_ENV !== "production") {
    console.error("Unhandled error:", err);
  }

  sendError(res, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred");
}
