import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email is required").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  bio: z.string().trim().max(500).optional()
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(160),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  category: z.string().trim().min(2, "Category is required").max(80),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
});

export const createModuleSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().trim().max(2000).optional()
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  content: z.string().trim().min(1, "Lesson content is required").max(50000),
  videoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v), "Must be a valid http(s) URL")
    .optional(),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  isPublished: z.boolean()
});

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(5000),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().int().min(1).max(1000),
  allowResubmission: z.boolean(),
  maxResubmissions: z.coerce.number().int().min(0).max(20),
  allowLateSubmission: z.boolean()
});

export const gradeSubmissionSchema = z.object({
  score: z.coerce.number().int().min(0, "Score must be >= 0"),
  feedback: z.string().trim().max(5000).optional()
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  timeLimitMinutes: z.coerce.number().int().min(1).max(300),
  passingScore: z.coerce.number().int().min(0),
  maxAttempts: z.coerce.number().int().min(1).max(20)
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]),
  bio: z.string().trim().max(500).optional()
});
