import { CourseStatus, Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Files & Authorized Streaming", () => {
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

  it("rejects executables, double extensions, and spoofed magic bytes; streams authorized materials", async () => {
    const inst = await createUserAndLogin(app, {
      email: "inst@test.edu",
      name: "Instructor",
      role: Role.INSTRUCTOR
    });
    const enrolledStudent = await createUserAndLogin(app, {
      email: "enrolled@test.edu",
      name: "Enrolled Student",
      role: Role.STUDENT
    });
    const outsiderStudent = await createUserAndLogin(app, {
      email: "outsider@test.edu",
      name: "Outsider Student",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Security Lab",
        slug: "security-lab",
        description: "File security and streaming tests.",
        category: "Security",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });

    await prisma.enrollment.create({
      data: { studentId: enrolledStudent.user.id, courseId: course.id }
    });

    // Reject double extension
    const doubleExt = await inst.agent
      .post("/api/v1/files")
      .set("X-CSRF-Token", inst.csrfToken)
      .attach("file", Buffer.from("%PDF-1.4\nfake"), "payload.exe.pdf");
    expect(doubleExt.status).toBe(400);

    // Reject spoofed PDF magic bytes
    const spoofed = await inst.agent
      .post("/api/v1/files")
      .set("X-CSRF-Token", inst.csrfToken)
      .attach("file", Buffer.from("#!/bin/sh\nwhoami"), "script.pdf");
    expect(spoofed.status).toBe(400);

    // Valid PDF upload
    const validPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const uploadRes = await inst.agent
      .post("/api/v1/files")
      .set("X-CSRF-Token", inst.csrfToken)
      .attach("file", validPdf, "syllabus.pdf");
    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.data.file.id as string;
    expect(uploadRes.body.data.file.storageKey).toBeUndefined();

    // Attach to course
    const attachRes = await inst.agent
      .post(`/api/v1/courses/${course.id}/materials`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Course Syllabus", fileId });
    expect(attachRes.status).toBe(201);

    // Enrolled student can stream file
    const enrolledFetch = await enrolledStudent.agent.get(`/api/v1/files/${fileId}`);
    expect(enrolledFetch.status).toBe(200);
    expect(enrolledFetch.headers["content-type"]).toContain("application/pdf");

    // Unenrolled student gets 404
    const outsiderFetch = await outsiderStudent.agent.get(`/api/v1/files/${fileId}`);
    expect(outsiderFetch.status).toBe(404);
  });
});
