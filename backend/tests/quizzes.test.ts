import { CourseStatus, Role } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { prisma } from "../src/config/prisma";
import { createApp } from "../src/app";
import { createUserAndLogin, resetDatabase } from "./helpers/auth";

const app = createApp();

describe("Quiz Engine", () => {
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

  it("hides isCorrect before submission, enforces single IN_PROGRESS attempt, grades server-side, and prevents resubmission", async () => {
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
    const otherStudent = await createUserAndLogin(app, {
      email: "otherstudent@test.edu",
      name: "Other Student",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Quiz Course",
        slug: "quiz-course",
        description: "Course with quiz.",
        category: "CS",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });

    await prisma.enrollment.create({
      data: { studentId: student.user.id, courseId: course.id }
    });
    await prisma.enrollment.create({
      data: { studentId: otherStudent.user.id, courseId: course.id }
    });

    const quizRes = await inst.agent
      .post(`/api/v1/courses/${course.id}/quizzes`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        title: "Midterm Quiz",
        timeLimitMinutes: 15,
        passingScore: 2,
        maxAttempts: 1
      });
    expect(quizRes.status).toBe(201);
    const quizId = quizRes.body.data.quiz.id as string;

    const q1Res = await inst.agent
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set("X-CSRF-Token", inst.csrfToken)
      .send({
        prompt: "What is 2 + 2?",
        points: 2,
        options: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true }
        ]
      });
    expect(q1Res.status).toBe(201);
    const q1 = q1Res.body.data.question;
    const correctOption = q1.options.find((o: { isCorrect: boolean }) => o.isCorrect);

    // Student GET quiz -> isCorrect MUST NOT exist
    const getQuizRes = await student.agent.get(`/api/v1/quizzes/${quizId}`);
    expect(getQuizRes.status).toBe(200);
    for (const opt of getQuizRes.body.data.quiz.questions[0].options) {
      expect(opt.isCorrect).toBeUndefined();
    }

    // Start attempt
    const startRes = await student.agent
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(startRes.status).toBe(201);
    const attemptId = startRes.body.data.attempt.id as string;
    for (const opt of startRes.body.data.questions[0].options) {
      expect(opt.isCorrect).toBeUndefined();
    }

    // Starting second attempt while IN_PROGRESS -> 409
    const secondStart = await student.agent
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(secondStart.status).toBe(409);

    // Cross-student cannot view result -> 404
    const crossResult = await otherStudent.agent.get(`/api/v1/attempts/${attemptId}/result`);
    expect(crossResult.status).toBe(404);

    // Submit attempt
    const submitRes = await student.agent
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({
        answers: [{ questionId: q1.id, selectedOptionId: correctOption.id }]
      });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.attempt.status).toBe("SUBMITTED");
    expect(submitRes.body.data.attempt.score).toBe(2);
    expect(submitRes.body.data.attempt.passed).toBe(true);

    // Submitted attempt is immutable -> 409
    const resubmit = await student.agent
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({ answers: [] });
    expect(resubmit.status).toBe(409);

    // Max attempts (1) reached -> 409
    const exceedMax = await student.agent
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set("X-CSRF-Token", student.csrfToken);
    expect(exceedMax.status).toBe(409);
  });

  it("grades expired attempt using only previously saved answers and marks EXPIRED", async () => {
    const inst = await createUserAndLogin(app, {
      email: "inst-exp@test.edu",
      name: "Instructor Exp",
      role: Role.INSTRUCTOR
    });
    const student = await createUserAndLogin(app, {
      email: "stud-exp@test.edu",
      name: "Student Exp",
      role: Role.STUDENT
    });

    const course = await prisma.course.create({
      data: {
        title: "Timed Quiz Course",
        slug: "timed-quiz-course",
        description: "Tests expiry grading.",
        category: "CS",
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: inst.user.id
      }
    });
    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.user.id, courseId: course.id }
    });
    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: "Expired Quiz",
        timeLimitMinutes: 5,
        passingScore: 1,
        maxAttempts: 2
      }
    });
    const q1 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: "Q1",
        points: 1,
        position: 1,
        options: {
          create: [
            { text: "Yes", isCorrect: true, position: 1 },
            { text: "No", isCorrect: false, position: 2 }
          ]
        }
      },
      include: { options: true }
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId: student.user.id,
        enrollmentId: enrollment.id,
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 60s ago (> 30s grace)
        scoreMax: 1
      }
    });

    // Submit after expiry with a new answer -> ignored, graded as EXPIRED with 0 saved answers
    const submitExpired = await student.agent
      .post(`/api/v1/attempts/${attempt.id}/submit`)
      .set("X-CSRF-Token", student.csrfToken)
      .send({
        answers: [{ questionId: q1.id, selectedOptionId: q1.options[0]!.id }]
      });
    expect(submitExpired.status).toBe(200);
    expect(submitExpired.body.data.attempt.status).toBe("EXPIRED");
    expect(submitExpired.body.data.attempt.score).toBe(0);
    expect(submitExpired.body.data.attempt.passed).toBe(false);
  });
});
