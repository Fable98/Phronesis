import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";

const app = createApp();

async function resetDb() {
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

describe("Auth, Sessions & CSRF", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("rejects state-changing requests without CSRF token", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "Password123!",
      name: "Test Student"
    });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects public registration if role field is provided", async () => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/v1/auth/csrf");
    const csrfToken = csrfRes.body.data.csrfToken;

    const res = await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: "hacker@example.com",
        password: "Password123!",
        name: "Attempted Admin",
        role: "ADMIN"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("registers a STUDENT, rotates session on login, and deletes session on logout", async () => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/v1/auth/csrf");
    const csrfToken = csrfRes.body.data.csrfToken;

    const regRes = await agent
      .post("/api/v1/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: "alice@example.com",
        password: "Password123!",
        name: "Alice Student"
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.role).toBe("STUDENT");
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    const sessionsAfterReg = await prisma.session.findMany();
    expect(sessionsAfterReg).toHaveLength(1);
    const firstSessionToken = sessionsAfterReg[0]!.token;

    // Login again using updated CSRF token -> rotates session
    const loginCsrf = regRes.body.data.csrfToken;
    const loginRes = await agent
      .post("/api/v1/auth/login")
      .set("X-CSRF-Token", loginCsrf)
      .send({
        email: "alice@example.com",
        password: "Password123!"
      });

    expect(loginRes.status).toBe(200);
    const sessionsAfterLogin = await prisma.session.findMany();
    expect(sessionsAfterLogin).toHaveLength(1);
    expect(sessionsAfterLogin[0]!.token).not.toBe(firstSessionToken);

    // /me works
    const meRes = await agent.get("/api/v1/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe("alice@example.com");

    // Logout deletes session
    const logoutRes = await agent
      .post("/api/v1/auth/logout")
      .set("X-CSRF-Token", loginRes.body.data.csrfToken);
    expect(logoutRes.status).toBe(200);

    const sessionsAfterLogout = await prisma.session.findMany();
    expect(sessionsAfterLogout).toHaveLength(0);

    const meAfterLogout = await agent.get("/api/v1/auth/me");
    expect(meAfterLogout.status).toBe(401);
  });
});
