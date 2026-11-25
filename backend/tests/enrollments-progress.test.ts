import { CourseStatus, Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Enrollments & Progress", () => {
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

  it("enrolls student, tracks idempotent lesson completion, and transitions enrollment to COMPLETED at 100%", async () => {
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
        title: "Published Course",
        slug: "published-course",
        description: "Course for testing enrollments and progress.",
        category: "Engineering",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });

    const mod = await prisma.module.create({
      data: { courseId: course.id, title: "Module 1", position: 1 }
    });
    const l1 = await prisma.lesson.create({
      data: { moduleId: mod.id, title: "L1", content: "Body 1", position: 1, isPublished: true }
    });
    const l2 = await prisma.lesson.create({
      data: { moduleId: mod.id, title: "L2", content: "Body 2", position: 2, isPublished: true }
    });
    await prisma.lesson.create({
      data: { moduleId: mod.id, title: "Draft Lesson", content: "Hidden", position: 3, isPublished: false }
    });

    const enrollRes = await student.agent
      .post("/api/v1/enrollments")
      .set("X-CSRF-Token", student.csrfToken)
      .send({ courseId: course.id });
    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.enrollment.status).toBe("ACTIVE");

    // Duplicate enroll -> 409
    const dupEnroll = await student.agent
      .post("/api/v1/enrollments")
      .set("X-CSRF-Token", student.csrfToken)
      .send({ courseId: course.id });
    expect(dupEnroll.status).toBe(409);

    // Complete lesson 1 -> 50%
    const c1 = await student.agent
      .post(`/api/v1/lessons/${l1.id}/complete`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(c1.status).toBe(200);
    expect(c1.body.data.progress.percentage).toBe(50);
    expect(c1.body.data.enrollmentStatus).toBe("ACTIVE");

    // Idempotent repeat of lesson 1 -> still 50%
    const c1Repeat = await student.agent
      .post(`/api/v1/lessons/${l1.id}/complete`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(c1Repeat.status).toBe(200);
    expect(c1Repeat.body.data.progress.percentage).toBe(50);

    // Complete lesson 2 -> 100% (ignores unpublished lesson 3) -> COMPLETED
    const c2 = await student.agent
      .post(`/api/v1/lessons/${l2.id}/complete`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(c2.status).toBe(200);
    expect(c2.body.data.progress.percentage).toBe(100);
    expect(c2.body.data.enrollmentStatus).toBe("COMPLETED");
  });
});
