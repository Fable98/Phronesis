import { CourseStatus, EnrollmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { buildPaginationMeta } from "../../utils/response";
import { computeCourseProgress } from "../progress/progress.service";
import { ListEnrollmentsQuery } from "./enrollments.types";

export async function enrollInCourse(studentId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundError("Course not found");
  }
  if (course.status !== CourseStatus.PUBLISHED) {
    if (course.status === CourseStatus.ARCHIVED) {
      throw new ConflictError("Cannot enroll in an archived course");
    }
    throw new NotFoundError("Course not found");
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId, courseId }
    }
  });

  if (existing) {
    if (existing.status === EnrollmentStatus.DROPPED) {
      return prisma.enrollment.update({
        where: { id: existing.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          lastAccessedAt: new Date()
        },
        include: {
          course: {
            select: { id: true, title: true, slug: true, category: true, difficultyLevel: true, status: true }
          }
        }
      });
    }
    throw new ConflictError("Already enrolled in this course");
  }

  return prisma.enrollment.create({
    data: {
      studentId,
      courseId,
      status: EnrollmentStatus.ACTIVE
    },
    include: {
      course: {
        select: { id: true, title: true, slug: true, category: true, difficultyLevel: true, status: true }
      }
    }
  });
}

export async function listMyEnrollments(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: { not: EnrollmentStatus.DROPPED }
    },
    orderBy: { lastAccessedAt: "desc" },
    include: {
      course: {
        include: {
          instructor: {
            select: { id: true, name: true }
          },
          _count: {
            select: { modules: true, assignments: true, quizzes: true }
          }
        }
      }
    }
  });

  const enriched = await Promise.all(
    enrollments.map(async (e) => {
      const progress = await computeCourseProgress(studentId, e.courseId);
      return {
        ...e,
        progress
      };
    })
  );

  return { enrollments: enriched };
}

export async function listAllEnrollments(query: ListEnrollmentsQuery) {
  const where: Prisma.EnrollmentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.courseId ? { courseId: query.courseId } : {})
  };

  const skip = (query.page - 1) * query.pageSize;
  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: "desc" },
      skip,
      take: query.pageSize,
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, category: true, status: true } }
      }
    }),
    prisma.enrollment.count({ where })
  ]);

  const enriched = await Promise.all(
    enrollments.map(async (e) => {
      const progress = await computeCourseProgress(e.studentId, e.courseId);
      return {
        ...e,
        progress
      };
    })
  );

  return {
    enrollments: enriched,
    meta: buildPaginationMeta(query.page, query.pageSize, total)
  };
}

export async function dropEnrollment(enrollmentId: string, studentId: string) {
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment || enrollment.studentId !== studentId) {
    throw new NotFoundError("Enrollment not found");
  }
  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: EnrollmentStatus.DROPPED }
  });
}
