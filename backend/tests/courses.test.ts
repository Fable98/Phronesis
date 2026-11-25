import { Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Courses & Lifecycle", () => {
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

  it("enforces full lifecycle transitions and rejects invalid transitions with 409", async () => {
    const admin = await createUserAndLogin(app, {
      email: "admin@test.edu",
      name: "Admin",
      role: Role.ADMIN
    });
    const inst1 = await createUserAndLogin(app, {
      email: "inst1@test.edu",
      name: "Instructor 1",
      role: Role.INSTRUCTOR
    });
    const inst2 = await createUserAndLogin(app, {
      email: "inst2@test.edu",
      name: "Instructor 2",
      role: Role.INSTRUCTOR
    });

    // Create DRAFT course
    const createRes = await inst1.agent
      .post("/api/v1/courses")
      .set("X-CSRF-Token", inst1.csrfToken)
      .send({
        title: "Distributed Systems 101",
        description: "Learn consensus, replication, and fault tolerance.",
        category: "Backend Engineering",
        difficultyLevel: "INTERMEDIATE"
      });
    expect(createRes.status).toBe(201);
    const courseId = createRes.body.data.course.id as string;
    expect(createRes.body.data.course.status).toBe("DRAFT");

    // Cross-owner edit returns 404
    const crossEdit = await inst2.agent
      .patch(`/api/v1/courses/${courseId}`)
      .set("X-CSRF-Token", inst2.csrfToken)
      .send({ title: "Hijacked" });
    expect(crossEdit.status).toBe(404);

    // Invalid transition: ADMIN cannot approve DRAFT directly (must be PENDING)
    const approveDraft = await admin.agent
      .patch(`/api/v1/courses/${courseId}/review`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decision: "APPROVE" });
    expect(approveDraft.status).toBe(409);

    // Submit DRAFT -> PENDING
    const submitRes = await inst1.agent
      .post(`/api/v1/courses/${courseId}/submit`)
      .set("X-CSRF-Token", inst1.csrfToken);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.course.status).toBe("PENDING");

    // Reject PENDING -> REJECTED
    const rejectRes = await admin.agent
      .patch(`/api/v1/courses/${courseId}/review`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decision: "REJECT", rejectionReason: "Add syllabus details" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.course.status).toBe("REJECTED");

    // Edit transitions REJECTED -> DRAFT
    const editRes = await inst1.agent
      .patch(`/api/v1/courses/${courseId}`)
      .set("X-CSRF-Token", inst1.csrfToken)
      .send({ description: "Updated description with full syllabus details and modules." });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.course.status).toBe("DRAFT");
    expect(editRes.body.data.course.rejectionReason).toBeNull();

    // Resubmit & approve -> PUBLISHED
    await inst1.agent
      .post(`/api/v1/courses/${courseId}/submit`)
      .set("X-CSRF-Token", inst1.csrfToken);
    const publishRes = await admin.agent
      .patch(`/api/v1/courses/${courseId}/review`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ decision: "APPROVE" });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.course.status).toBe("PUBLISHED");

    // Public catalog lists PUBLISHED course
    const publicList = await app ? await (await import("supertest")).default(app).get("/api/v1/courses") : null;
    expect(publicList?.status).toBe(200);
    expect(publicList?.body.data.courses).toHaveLength(1);

    // Archive PUBLISHED -> ARCHIVED
    const archiveRes = await inst1.agent
      .post(`/api/v1/courses/${courseId}/archive`)
      .set("X-CSRF-Token", inst1.csrfToken);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.course.status).toBe("ARCHIVED");

    // Archived course cannot be edited -> 409
    const editArchived = await inst1.agent
      .patch(`/api/v1/courses/${courseId}`)
      .set("X-CSRF-Token", inst1.csrfToken)
      .send({ title: "Edited archived" });
    expect(editArchived.status).toBe(409);
  });

  it("archives instead of deleting when enrollments exist and stays readable to enrolled student", async () => {
    const inst = await createUserAndLogin(app, {
      email: "inst-arch@test.edu",
      name: "Instructor Arch",
      role: Role.INSTRUCTOR
    });
    const student = await createUserAndLogin(app, {
      email: "stud-arch@test.edu",
      name: "Student Arch",
      role: Role.STUDENT
    });
    const outsider = await createUserAndLogin(app, {
      email: "out-arch@test.edu",
      name: "Outsider",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Archive Policy Course",
        slug: "archive-policy-course",
        description: "Tests archive instead of delete.",
        category: "Engineering",
        status: "PUBLISHED",
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });

    await prisma.enrollment.create({
      data: { studentId: student.user.id, courseId: course.id }
    });

    // Delete with enrollment -> archives instead
    const delRes = await inst.agent
      .delete(`/api/v1/courses/${course.id}`)
      .set("X-CSRF-Token", inst.csrfToken);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.archived).toBe(true);
    expect(delRes.body.data.deleted).toBe(false);

    // Enrolled student can still read archived course
    const enrolledRead = await student.agent.get(`/api/v1/courses/${course.id}`);
    expect(enrolledRead.status).toBe(200);

    // Unenrolled student gets 404
    const outsiderRead = await outsider.agent.get(`/api/v1/courses/${course.id}`);
    expect(outsiderRead.status).toBe(404);
  });
});
