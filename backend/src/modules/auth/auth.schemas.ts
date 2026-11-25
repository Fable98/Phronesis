import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().trim().email("Valid email is required").max(255),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    bio: z.string().trim().max(500).optional()
  })
  .strict();

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).nullable().optional()
});
