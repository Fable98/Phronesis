import { Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("RBAC & Admin User Management", () => {
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

  it("blocks STUDENT and INSTRUCTOR from /api/v1/users with 403", async () => {
    const student = await createUserAndLogin(app, {
      email: "student@test.edu",
      name: "Student One",
      role: Role.STUDENT
    });
    const instructor = await createUserAndLogin(app, {
      email: "inst@test.edu",
      name: "Instructor One",
      role: Role.INSTRUCTOR
    });

    const r1 = await student.agent.get("/api/v1/users");
    expect(r1.status).toBe(403);

    const r2 = await instructor.agent.get("/api/v1/users");
    expect(r2.status).toBe(403);
  });

  it("allows ADMIN to create instructor/admin and prevents demoting or deleting last admin", async () => {
    const admin = await createUserAndLogin(app, {
      email: "admin@test.edu",
      name: "Sole Admin",
      role: Role.ADMIN
    });

    // Cannot demote or delete sole admin
    const demoteSole = await admin.agent
      .patch(`/api/v1/users/${admin.user.id}/role`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "STUDENT" });
    expect(demoteSole.status).toBe(409);

    const deleteSole = await admin.agent
      .delete(`/api/v1/users/${admin.user.id}`)
      .set("X-CSRF-Token", admin.csrfToken);
    expect(deleteSole.status).toBe(409);

    // Admin creates an instructor
    const createInst = await admin.agent
      .post("/api/v1/users")
      .set("X-CSRF-Token", admin.csrfToken)
      .send({
        email: "newinst@test.edu",
        password: "Password123!",
        name: "New Instructor",
        role: "INSTRUCTOR"
      });
    expect(createInst.status).toBe(201);
    expect(createInst.body.data.user.role).toBe("INSTRUCTOR");

    // Promote instructor to ADMIN -> now 2 admins exist, so first admin can be demoted
    const promote = await admin.agent
      .patch(`/api/v1/users/${createInst.body.data.user.id}/role`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "ADMIN" });
    expect(promote.status).toBe(200);
    expect(promote.body.data.user.role).toBe("ADMIN");

    const demoteFirst = await admin.agent
      .patch(`/api/v1/users/${admin.user.id}/role`)
      .set("X-CSRF-Token", admin.csrfToken)
      .send({ role: "INSTRUCTOR" });
    expect(demoteFirst.status).toBe(200);
    expect(demoteFirst.body.data.user.role).toBe("INSTRUCTOR");
  });
});
