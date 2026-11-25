import { Role } from "@prisma/client";
import { Express } from "express";
import request from "supertest";
import { prisma } from "../../src/config/prisma";
import { hashPassword } from "../../src/utils/password";

export async function resetDatabase() {
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.courseMaterial.deleteMany();
  await prisma.storedFile.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUserAndLogin(
  app: Express,
  opts: { email: string; name: string; role: Role; password?: string }
) {
  const password = opts.password ?? "Password123!";
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: opts.email.toLowerCase(),
      name: opts.name,
      role: opts.role,
      passwordHash
    }
  });

  const agent = request.agent(app);
  const csrfRes = await agent.get("/api/v1/auth/csrf");
  const csrfToken = csrfRes.body.data.csrfToken as string;

  const loginRes = await agent
    .post("/api/v1/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password });

  return {
    user,
    agent,
    csrfToken: loginRes.body.data.csrfToken as string
  };
}
