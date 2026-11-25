import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { BadRequestError } from "../utils/errors";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        next(new BadRequestError("Invalid path parameters", parsed.error.flatten().fieldErrors));
        return;
      }
      req.validatedParams = parsed.data;
      req.params = parsed.data as Record<string, string>;
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        next(new BadRequestError("Invalid query parameters", parsed.error.flatten().fieldErrors));
        return;
      }
      req.validatedQuery = parsed.data;
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(new BadRequestError("Invalid request body", parsed.error.flatten().fieldErrors));
        return;
      }
      req.body = parsed.data;
    }

    next();
  };
}
