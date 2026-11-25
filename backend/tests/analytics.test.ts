import { CourseStatus, Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Analytics Endpoints", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("returns platform, instructor, and student analytics with proper role enforcement", async () => {
    const admin = await createUserAndLogin(app, {
      email: "admin@test.edu",
      name: "Admin",
      role: Role.ADMIN
    });
    const inst = await createUserAndLogin(app, {
      email: "inst@test.edu",
      name: "Instructor",
      role: Role.INSTRUCTOR
    });
    const student = await createUserAndLogin(app, {
      email: "student@test.edu",
      name: "Student",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Analytics Course",
        slug: "analytics-course",
        description: "Testing analytics.",
        category: "Data Science",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: "M1", position: 1 }
    });
    const lesson = await prisma.lesson.create({
      data: { moduleId: mod.id, title: "L1", content: "Body", position: 1 }
    });
    await prisma.enrollment.create({
      data: { studentId: student.user.id, courseId: course.id }
    });

    // Student cannot access admin or instructor analytics
    expect((await student.agent.get("/api/v1/analytics/platform")).status).toBe(403);
    expect((await student.agent.get("/api/v1/analytics/instructor")).status).toBe(403);

    const platformRes = await admin.agent.get("/api/v1/analytics/platform");
    expect(platformRes.status).toBe(200);
    expect(platformRes.body.data.totals.totalUsers).toBe(3);
    expect(platformRes.body.data.totals.totalCourses).toBe(1);

    const instRes = await inst.agent.get("/api/v1/analytics/instructor");
    expect(instRes.status).toBe(200);
    expect(instRes.body.data.totals.totalCourses).toBe(1);
    expect(instRes.body.data.totals.totalEnrollments).toBe(1);

    const studRes = await student.agent.get("/api/v1/analytics/student");
    expect(studRes.status).toBe(200);
    expect(studRes.body.data.totals.enrolledCourses).toBe(1);
    expect(studRes.body.data.continueLearning.nextLessonId).toBe(lesson.id);
  });
});
