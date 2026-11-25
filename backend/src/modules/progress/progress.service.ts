import { CourseStatus, EnrollmentStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { NotFoundError } from "../../utils/errors";
import { CourseProgressSummary } from "./progress.types";

export async function computeCourseProgress(
  studentId: string,
  courseId: string
): Promise<CourseProgressSummary> {
  const publishedLessons = await prisma.lesson.findMany({
    where: {
      isPublished: true,
      module: { courseId }
    },
    select: { id: true }
  });

  const totalLessons = publishedLessons.length;
  if (totalLessons === 0) {
    return {
      completedLessons: 0,
      totalLessons: 0,
      percentage: 0,
      completedLessonIds: []
    };
  }

  const lessonIds = publishedLessons.map((l) => l.id);
  const completedRows = await prisma.lessonProgress.findMany({
    where: {
      studentId,
      lessonId: { in: lessonIds }
    },
    select: { lessonId: true }
  });

  const completedLessonIds = completedRows.map((r) => r.lessonId);
  const completedLessons = completedLessonIds.length;
  const percentage = Math.round((completedLessons / totalLessons) * 100);

  return {
    completedLessons,
    totalLessons,
    percentage,
    completedLessonIds
  };
}

export async function markLessonComplete(studentId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: true }
      }
    }
  });

  if (!lesson || !lesson.isPublished) {
    throw new NotFoundError("Lesson not found");
  }

  const course = lesson.module.course;
  if (course.status !== CourseStatus.PUBLISHED && course.status !== CourseStatus.ARCHIVED) {
    throw new NotFoundError("Lesson not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId: course.id
      }
    }
  });

  if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
    throw new NotFoundError("Enrollment not found for this course");
  }

  await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId,
        lessonId
      }
    },
    update: {},
    create: {
      studentId,
      lessonId
    }
  });

  const progress = await computeCourseProgress(studentId, course.id);
  const reachedCompletion = progress.totalLessons > 0 && progress.percentage >= 100;

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      lastAccessedAt: new Date(),
      ...(reachedCompletion && enrollment.status !== EnrollmentStatus.COMPLETED
        ? {
            status: EnrollmentStatus.COMPLETED,
            completedAt: new Date()
          }
        : {})
    }
  });

  return {
    lessonId,
    completed: true,
    progress,
    enrollmentStatus: updatedEnrollment.status
  };
}

export async function getCourseProgressForUser(courseId: string, user: AuthenticatedUser) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId
      }
    }
  });

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === course.instructorId;

  if (!enrollment && !isAdmin && !isOwner) {
    throw new NotFoundError("Enrollment not found");
  }

  if (enrollment && enrollment.status === EnrollmentStatus.DROPPED && !isAdmin && !isOwner) {
    throw new NotFoundError("Enrollment not found");
  }

  const progress = await computeCourseProgress(user.id, courseId);
  return {
    courseId,
    enrollmentStatus: enrollment?.status ?? null,
    lastAccessedAt: enrollment?.lastAccessedAt ?? null,
    progress
  };
}
