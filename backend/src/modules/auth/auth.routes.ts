import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { loginRateLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import * as authController from "./auth.controller";
import { loginSchema, registerSchema, updateMeSchema } from "./auth.schemas";

const router = Router();

router.get("/csrf", asyncHandler(authController.getCsrf));
router.post("/register", validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", loginRateLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));
router.patch("/me", authenticate, validate({ body: updateMeSchema }), asyncHandler(authController.updateProfile));

export default router;
