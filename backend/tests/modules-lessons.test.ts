import { Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Modules, Lessons & Transactional Reorder", () => {
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

  it("creates, reorders modules and lessons inside a transaction without unique constraint errors", async () => {
    const inst = await createUserAndLogin(app, {
      email: "inst@test.edu",
      name: "Instructor",
      role: Role.INSTRUCTOR
    });
    const otherInst = await createUserAndLogin(app, {
      email: "other@test.edu",
      name: "Other Instructor",
      role: Role.INSTRUCTOR
    });

    const courseRes = await inst.agent
      .post("/api/v1/courses")
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        title: "Algorithms & Data Structures",
        description: "Graphs, trees, dynamic programming, and complexity analysis.",
        category: "Computer Science",
        difficultyLevel: "INTERMEDIATE"
      });
    const courseId = courseRes.body.data.course.id as string;

    const m1 = await inst.agent
      .post(`/api/v1/courses/${courseId}/modules`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Module A" });
    const m2 = await inst.agent
      .post(`/api/v1/courses/${courseId}/modules`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Module B" });
    const m3 = await inst.agent
      .post(`/api/v1/courses/${courseId}/modules`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Module C" });

    expect(m1.status).toBe(201);
    expect(m3.body.data.module.position).toBe(3);

    // Cross-owner reorder returns 404
    const crossReorder = await otherInst.agent
      .patch(`/api/v1/courses/${courseId}/modules/reorder`)
      .set("X-CSRF-Token", otherInst.csrfToken)
      .send({
        moduleIds: [m3.body.data.module.id, m1.body.data.module.id, m2.body.data.module.id]
      });
    expect(crossReorder.status).toBe(404);

    // Reorder modules C, A, B
    const reorderMods = await inst.agent
      .patch(`/api/v1/courses/${courseId}/modules/reorder`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        moduleIds: [m3.body.data.module.id, m1.body.data.module.id, m2.body.data.module.id]
      });
    expect(reorderMods.status).toBe(200);
    expect(reorderMods.body.data.modules.map((m: { title: string }) => m.title)).toEqual([
      "Module C",
      "Module A",
      "Module B"
    ]);

    const moduleId = m1.body.data.module.id as string;
    const l1 = await inst.agent
      .post(`/api/v1/modules/${moduleId}/lessons`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Lesson 1", content: "Content 1" });
    const l2 = await inst.agent
      .post(`/api/v1/modules/${moduleId}/lessons`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ title: "Lesson 2", content: "Content 2" });

    const reorderLessons = await inst.agent
      .patch(`/api/v1/modules/${moduleId}/lessons/reorder`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({ lessonIds: [l2.body.data.lesson.id, l1.body.data.lesson.id] });
    expect(reorderLessons.status).toBe(200);
    expect(reorderLessons.body.data.lessons.map((l: { title: string }) => l.title)).toEqual([
      "Lesson 2",
      "Lesson 1"
    ]);
  });
});
