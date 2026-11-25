import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requireCsrf } from "./middleware/csrf";
import { errorHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimit";
import authRoutes from "./modules/auth/auth.routes";
import coursesRoutes from "./modules/courses/courses.routes";
import usersRoutes from "./modules/users/users.routes";
import { NotFoundError } from "./utils/errors";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api/v1", apiRateLimiter);
  app.use("/api/v1", requireCsrf);

  app.get("/api/v1/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", service: "phronesis-api" } });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/courses", coursesRoutes);

  app.use((_req, _res, next) => {
    next(new NotFoundError("Endpoint not found"));
  });

  app.use(errorHandler);

  return app;
}
