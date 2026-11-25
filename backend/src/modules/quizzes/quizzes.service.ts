import { CourseStatus, EnrollmentStatus, QuizAttemptStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { assertCourseOwnershipOrAdmin } from "../courses/courses.service";
import {
  CreateQuestionInput,
  CreateQuizInput,
  SaveQuizAnswersInput,
  SubmitQuizAttemptInput,
  UpdateQuizInput
} from "./quizzes.types";

const GRACE_PERIOD_MS = 30_000;

async function assertQuizOwnershipOrAdmin(quizId: string, user: AuthenticatedUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true }
  });
  if (!quiz) {
    throw new NotFoundError("Quiz not found");
  }
  if (user.role !== Role.ADMIN && quiz.course.instructorId !== user.id) {
    throw new NotFoundError("Quiz not found");
  }
  return quiz;
}

export async function listCourseQuizzes(courseId: string, user: AuthenticatedUser) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === course.instructorId;

  if (!isAdmin && !isOwner) {
    if (course.status !== CourseStatus.PUBLISHED && course.status !== CourseStatus.ARCHIVED) {
      throw new NotFoundError("Course not found");
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } }
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
      throw new NotFoundError("Course not found");
    }
  }

  const showDetails = isAdmin || isOwner;
  return prisma.quiz.findMany({
    where: {
      courseId,
      ...(showDetails ? {} : { isPublished: true })
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { questions: true, attempts: true } },
      ...(user.role === Role.STUDENT
        ? {
            attempts: {
              where: { studentId: user.id },
              orderBy: { startedAt: "desc" },
              select: {
                id: true,
                status: true,
                startedAt: true,
                expiresAt: true,
                submittedAt: true,
                score: true,
                scoreMax: true,
                passed: true
              }
            }
          }
        : {})
    }
  });
}

export async function getQuizById(quizId: string, user: AuthenticatedUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      questions: {
        orderBy: { position: "asc" },
        include: {
          options: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              text: true,
              position: true,
              isCorrect: user.role === Role.ADMIN || user.role === Role.INSTRUCTOR
            }
          }
        }
      }
    }
  });

  if (!quiz) {
    throw new NotFoundError("Quiz not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === quiz.course.instructorId;

  if (!isAdmin && !isOwner) {
    if (
      !quiz.isPublished ||
      (quiz.course.status !== CourseStatus.PUBLISHED &&
        quiz.course.status !== CourseStatus.ARCHIVED)
    ) {
      throw new NotFoundError("Quiz not found");
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId: quiz.courseId } }
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
      throw new NotFoundError("Quiz not found");
    }
  }

  // Strip isCorrect strictly for non-owners/non-admins
  const sanitizedQuestions = quiz.questions.map((q) => ({
    id: q.id,
    quizId: q.quizId,
    prompt: q.prompt,
    type: q.type,
    points: q.points,
    position: q.position,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      position: o.position,
      ...(isAdmin || isOwner ? { isCorrect: o.isCorrect } : {})
    }))
  }));

  const myAttempts =
    user.role === Role.STUDENT
      ? await prisma.quizAttempt.findMany({
          where: { quizId: quiz.id, studentId: user.id },
          orderBy: { startedAt: "desc" }
        })
      : undefined;

  return {
    quiz: {
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      isPublished: quiz.isPublished,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      questions: sanitizedQuestions
    },
    ...(myAttempts ? { myAttempts } : {})
  };
}

export async function createQuiz(
  courseId: string,
  user: AuthenticatedUser,
  input: CreateQuizInput
) {
  const course = await assertCourseOwnershipOrAdmin(courseId, user);
  if (course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot add quizzes to an archived course");
  }

  return prisma.quiz.create({
    data: {
      courseId,
      title: input.title,
      description: input.description ?? null,
      timeLimitMinutes: input.timeLimitMinutes,
      passingScore: input.passingScore,
      maxAttempts: input.maxAttempts,
      isPublished: input.isPublished
    }
  });
}

export async function updateQuiz(
  quizId: string,
  user: AuthenticatedUser,
  input: UpdateQuizInput
) {
  const existing = await assertQuizOwnershipOrAdmin(quizId, user);
  if (existing.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify quizzes of an archived course");
  }

  return prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.timeLimitMinutes !== undefined
        ? { timeLimitMinutes: input.timeLimitMinutes }
        : {}),
      ...(input.passingScore !== undefined ? { passingScore: input.passingScore } : {}),
      ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {})
    }
  });
}

export async function deleteQuiz(quizId: string, user: AuthenticatedUser) {
  const existing = await assertQuizOwnershipOrAdmin(quizId, user);
  if (existing.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot delete quizzes of an archived course");
  }
  await prisma.quiz.delete({ where: { id: quizId } });
}

export async function addQuestion(
  quizId: string,
  user: AuthenticatedUser,
  input: CreateQuestionInput
) {
  const quiz = await assertQuizOwnershipOrAdmin(quizId, user);
  if (quiz.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify questions of an archived course");
  }

  const maxAgg = await prisma.question.aggregate({
    where: { quizId },
    _max: { position: true }
  });
  const nextPosition = (maxAgg._max.position ?? 0) + 1;

  return prisma.question.create({
    data: {
      quizId,
      prompt: input.prompt,
      type: input.type,
      points: input.points,
      position: nextPosition,
      options: {
        create: input.options.map((opt, idx) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
          position: idx + 1
        }))
      }
    },
    include: {
      options: { orderBy: { position: "asc" } }
    }
  });
}

export async function deleteQuestion(questionId: string, user: AuthenticatedUser) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { quiz: { include: { course: true } } }
  });
  if (!question) {
    throw new NotFoundError("Question not found");
  }
  if (user.role !== Role.ADMIN && question.quiz.course.instructorId !== user.id) {
    throw new NotFoundError("Question not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.question.delete({ where: { id: questionId } });
    const remaining = await tx.question.findMany({
      where: { quizId: question.quizId },
      orderBy: { position: "asc" },
      select: { id: true }
    });
    const tempOffset = 10000;
    for (let i = 0; i < remaining.length; i++) {
      await tx.question.update({
        where: { id: remaining[i]!.id },
        data: { position: tempOffset + i + 1 }
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.question.update({
        where: { id: remaining[i]!.id },
        data: { position: i + 1 }
      });
    }
  });
}

async function finalizeAttempt(
  attemptId: string,
  status: QuizAttemptStatus,
  submittedAt: Date
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: true,
      answers: {
        include: {
          question: true,
          selectedOption: true
        }
      }
    }
  });
  if (!attempt) {
    throw new NotFoundError("Attempt not found");
  }

  let totalScore = 0;
  for (const ans of attempt.answers) {
    const isCorrect = ans.selectedOption.isCorrect;
    const pointsEarned = isCorrect ? ans.question.points : 0;
    totalScore += pointsEarned;
    await prisma.quizAnswer.update({
      where: { id: ans.id },
      data: { isCorrect, pointsEarned }
    });
  }

  const passed = totalScore >= attempt.quiz.passingScore;
  return prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status,
      submittedAt,
      score: totalScore,
      passed
    }
  });
}

export async function startAttempt(quizId: string, studentId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      questions: {
        orderBy: { position: "asc" },
        include: {
          options: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              text: true,
              position: true
            }
          }
        }
      }
    }
  });

  if (
    !quiz ||
    !quiz.isPublished ||
    (quiz.course.status !== CourseStatus.PUBLISHED &&
      quiz.course.status !== CourseStatus.ARCHIVED)
  ) {
    throw new NotFoundError("Quiz not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: quiz.courseId } }
  });
  if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
    throw new NotFoundError("You must be enrolled in this course to take this quiz");
  }

  if (quiz.questions.length === 0) {
    throw new BadRequestError("This quiz has no questions yet");
  }

  // Check if an IN_PROGRESS attempt exists
  const activeAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId,
      studentId,
      status: QuizAttemptStatus.IN_PROGRESS
    }
  });

  if (activeAttempt) {
    if (Date.now() > activeAttempt.expiresAt.getTime() + GRACE_PERIOD_MS) {
      await finalizeAttempt(activeAttempt.id, QuizAttemptStatus.EXPIRED, new Date());
    } else {
      throw new ConflictError("You already have an attempt in progress for this quiz", {
        attemptId: activeAttempt.id
      });
    }
  }

  const attemptCount = await prisma.quizAttempt.count({
    where: { quizId, studentId }
  });
  if (attemptCount >= quiz.maxAttempts) {
    throw new ConflictError(`Maximum attempts (${quiz.maxAttempts}) reached for this quiz`);
  }

  const scoreMax = quiz.questions.reduce((acc, q) => acc + q.points, 0);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + quiz.timeLimitMinutes * 60_000);

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId,
      enrollmentId: enrollment.id,
      status: QuizAttemptStatus.IN_PROGRESS,
      startedAt,
      expiresAt,
      scoreMax
    }
  });

  return {
    attempt,
    questions: quiz.questions
  };
}

export async function saveAnswers(
  attemptId: string,
  studentId: string,
  input: SaveQuizAnswersInput
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: { include: { options: true } }
        }
      }
    }
  });

  if (!attempt || attempt.studentId !== studentId) {
    throw new NotFoundError("Quiz attempt not found");
  }

  if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
    throw new ConflictError("Cannot modify answers of a finalized attempt");
  }

  if (Date.now() > attempt.expiresAt.getTime() + GRACE_PERIOD_MS) {
    throw new ConflictError("Quiz attempt has expired");
  }

  const questionMap = new Map(attempt.quiz.questions.map((q) => [q.id, q]));

  for (const ans of input.answers) {
    const q = questionMap.get(ans.questionId);
    if (!q) {
      throw new BadRequestError(`Question ${ans.questionId} does not belong to this quiz`);
    }
    const opt = q.options.find((o) => o.id === ans.selectedOptionId);
    if (!opt) {
      throw new BadRequestError(`Option ${ans.selectedOptionId} does not belong to question`);
    }

    await prisma.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: ans.questionId
        }
      },
      update: { selectedOptionId: ans.selectedOptionId },
      create: {
        attemptId,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId
      }
    });
  }

  return { saved: true };
}

export async function submitAttempt(
  attemptId: string,
  studentId: string,
  input: SubmitQuizAttemptInput
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true }
          }
        }
      }
    }
  });

  if (!attempt || attempt.studentId !== studentId) {
    throw new NotFoundError("Quiz attempt not found");
  }

  if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
    throw new ConflictError("Quiz attempt has already been submitted");
  }

  const now = new Date();
  const isExpired = now.getTime() > attempt.expiresAt.getTime() + GRACE_PERIOD_MS;

  if (!isExpired && input.answers.length > 0) {
    const questionMap = new Map(attempt.quiz.questions.map((q) => [q.id, q]));
    for (const ans of input.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) {
        throw new BadRequestError(`Question ${ans.questionId} does not belong to this quiz`);
      }
      const opt = q.options.find((o) => o.id === ans.selectedOptionId);
      if (!opt) {
        throw new BadRequestError(`Option ${ans.selectedOptionId} does not belong to question`);
      }
      await prisma.quizAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: ans.questionId
          }
        },
        update: { selectedOptionId: ans.selectedOptionId },
        create: {
          attemptId,
          questionId: ans.questionId,
          selectedOptionId: ans.selectedOptionId
        }
      });
    }
  }

  await finalizeAttempt(
    attemptId,
    isExpired ? QuizAttemptStatus.EXPIRED : QuizAttemptStatus.SUBMITTED,
    now
  );

  return getAttemptResult(attemptId, {
    id: studentId,
    email: "",
    name: "",
    role: Role.STUDENT,
    bio: null,
    isActive: true
  });
}

export async function getAttemptResult(attemptId: string, user: AuthenticatedUser) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          course: { select: { id: true, title: true, instructorId: true } },
          questions: {
            orderBy: { position: "asc" },
            include: {
              options: { orderBy: { position: "asc" } }
            }
          }
        }
      },
      answers: true
    }
  });

  if (!attempt) {
    throw new NotFoundError("Quiz attempt not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = attempt.quiz.course.instructorId === user.id;
  const isStudentOwner = attempt.studentId === user.id;

  if (!isAdmin && !isOwner && !isStudentOwner) {
    throw new NotFoundError("Quiz attempt not found");
  }

  if (attempt.status === QuizAttemptStatus.IN_PROGRESS) {
    // Never reveal isCorrect before submission; return safe in-progress payload
    return {
      attempt: {
        id: attempt.id,
        quizId: attempt.quizId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        scoreMax: attempt.scoreMax
      },
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        timeLimitMinutes: attempt.quiz.timeLimitMinutes,
        passingScore: attempt.quiz.passingScore,
        questions: attempt.quiz.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          position: q.position,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            position: o.position
          }))
        }))
      },
      savedAnswers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId
      }))
    };
  }

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  return {
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      scoreMax: attempt.scoreMax,
      passed: attempt.passed
    },
    quiz: {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
      passingScore: attempt.quiz.passingScore,
      course: attempt.quiz.course
    },
    breakdown: attempt.quiz.questions.map((q) => {
      const answer = answerMap.get(q.id);
      return {
        questionId: q.id,
        prompt: q.prompt,
        points: q.points,
        selectedOptionId: answer?.selectedOptionId ?? null,
        isCorrect: answer?.isCorrect ?? false,
        pointsEarned: answer?.pointsEarned ?? 0,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect
        }))
      };
    })
  };
}

export async function listMyQuizAttempts(studentId: string) {
  return prisma.quizAttempt.findMany({
    where: { studentId },
    orderBy: { startedAt: "desc" },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          course: { select: { id: true, title: true } }
        }
      }
    }
  });
}
