import { CourseStatus, Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Assignments & Submissions Grading", () => {
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

  it("enforces enrollment, late submission policy, maxResubmissions, and owner-only grading", async () => {
    const inst = await createUserAndLogin(app, {
      email: "inst@test.edu",
      name: "Instructor",
      role: Role.INSTRUCTOR
    });
    const otherInst = await createUserAndLogin(app, {
      email: "otherinst@test.edu",
      name: "Other Instructor",
      role: Role.INSTRUCTOR
    });
    const student = await createUserAndLogin(app, {
      email: "student@test.edu",
      name: "Student",
      role: Role.STUDENT
    });
    const outsider = await createUserAndLogin(app, {
      email: "outsider@test.edu",
      name: "Outsider",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Systems Engineering",
        slug: "systems-eng",
        description: "Assignments and grading tests.",
        category: "Engineering",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });

    await prisma.enrollment.create({
      data: { studentId: student.user.id, courseId: course.id }
    });

    // Assignment 1: past due date, allowLateSubmission=false
    const pastAssignment = await inst.agent
      .post(`/api/v1/courses/${course.id}/assignments`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        title: "Past Due Assignment",
        description: "Cannot submit late.",
        dueDate: new Date(Date.now() - 3600 * 1000).toISOString(),
        maxScore: 50,
        allowLateSubmission: false
      });
    expect(pastAssignment.status).toBe(201);

    const lateRejected = await student.agent
      .post(`/api/v1/assignments/${pastAssignment.body.data.assignment.id}/submissions`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({ content: "Late work" });
    expect(lateRejected.status).toBe(409);

    // Assignment 2: allows 1 resubmission and late submission
    const a2 = await inst.agent
      .post(`/api/v1/courses/${course.id}/assignments`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        title: "Project 1",
        description: "Build a cache.",
        dueDate: new Date(Date.now() - 1000).toISOString(),
        maxScore: 100,
        allowResubmission: true,
        maxResubmissions: 1,
        allowLateSubmission: true
      });
    const a2Id = a2.body.data.assignment.id as string;

    // Unenrolled student cannot submit -> 404
    const unenrolledSubmit = await outsider.agent
      .post(`/api/v1/assignments/${a2Id}/submissions`)
      .set("X-CSRF-Token", outsider.csrfToken)
      .send({ content: "Sneaky" });
    expect(unenrolledSubmit.status).toBe(404);

    // Attempt 1 (late)
    const sub1 = await student.agent
      .post(`/api/v1/assignments/${a2Id}/submissions`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({ content: "First attempt" });
    expect(sub1.status).toBe(201);
    expect(sub1.body.data.submission.attemptNumber).toBe(1);
    expect(sub1.body.data.submission.isLate).toBe(true);

    // Attempt 2 (resubmission 1)
    const sub2 = await student.agent
      .post(`/api/v1/assignments/${a2Id}/submissions`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({ content: "Second attempt" });
    expect(sub2.status).toBe(201);
    expect(sub2.body.data.submission.attemptNumber).toBe(2);

    // Attempt 3 exceeds maxResubmissions -> 409
    const sub3 = await student.agent
      .post(`/api/v1/assignments/${a2Id}/submissions`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({ content: "Third attempt" });
    expect(sub3.status).toBe(409);

    const subId = sub2.body.data.submission.id as string;

    // Cross-instructor cannot grade -> 404
    const crossGrade = await otherInst.agent
      .patch(`/api/v1/submissions/${subId}/grade`)
      .set("X-CSRF-Token", otherInst.csrfToken)
      .send({ score: 90, feedback: "Good" });
    expect(crossGrade.status).toBe(404);

    // Out-of-range score -> 400
    const badScore = await inst.agent
      .patch(`/api/v1/submissions/${subId}/grade`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ score: 150 });
    expect(badScore.status).toBe(400);

    // Valid grade by owning instructor
    const gradeRes = await inst.agent
      .patch(`/api/v1/submissions/${subId}/grade`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ score: 92, feedback: "Great improvement!" });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.submission.status).toBe("GRADED");
    expect(gradeRes.body.data.submission.score).toBe(92);
  });
});
