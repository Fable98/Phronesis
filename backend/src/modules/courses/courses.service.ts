import { CourseStatus, EnrollmentStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { buildPaginationMeta } from "../../utils/response";
import {
  COURSE_TRANSITIONS,
  CreateCourseInput,
  ListCoursesQuery,
  ReviewCourseInput,
  UpdateCourseInput
} from "./courses.types";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "course"}-${suffix}`;
}

export function assertTransition(from: CourseStatus, to: CourseStatus): void {
  const allowed = COURSE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new ConflictError(`Invalid course status transition from ${from} to ${to}`);
  }
}

export async function assertCourseOwnershipOrAdmin(
  courseId: string,
  user: AuthenticatedUser
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundError("Course not found");
  }
  if (user.role !== Role.ADMIN && course.instructorId !== user.id) {
    // 404 to avoid leaking resource existence across owners
    throw new NotFoundError("Course not found");
  }
  return course;
}

export async function listCourses(query: ListCoursesQuery, user?: AuthenticatedUser) {
  const where: Prisma.CourseWhereInput = {};

  if (query.mine && user && (user.role === Role.INSTRUCTOR || user.role === Role.ADMIN)) {
    where.instructorId = user.id;
    if (query.status) {
      where.status = query.status;
    }
  } else if (
    user?.role === Role.ADMIN &&
    (query.scope === "admin" || query.status !== undefined)
  ) {
    if (query.status) {
      where.status = query.status;
    }
  } else {
    // Public and student queries return PUBLISHED only
    where.status = CourseStatus.PUBLISHED;
  }

  if (query.category) {
    where.category = { equals: query.category, mode: "insensitive" };
  }
  if (query.difficultyLevel) {
    where.difficultyLevel = query.difficultyLevel;
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } }
    ];
  }

  let orderBy: Prisma.CourseOrderByWithRelationInput;
  switch (query.sort) {
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "title_asc":
      orderBy = { title: "asc" };
      break;
    case "title_desc":
      orderBy = { title: "desc" };
      break;
    case "popular":
      orderBy = { enrollments: { _count: "desc" } };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const skip = (query.page - 1) * query.pageSize;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      include: {
        instructor: {
          select: { id: true, name: true, email: true, bio: true }
        },
        _count: {
          select: { modules: true, enrollments: true, assignments: true, quizzes: true }
        }
      }
    }),
    prisma.course.count({ where })
  ]);

  return {
    courses,
    meta: buildPaginationMeta(query.page, query.pageSize, total)
  };
}

export async function getCourseById(courseId: string, user?: AuthenticatedUser) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { id: true, name: true, email: true, bio: true }
      },
      materials: {
        include: {
          file: {
            select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { enrollments: true, assignments: true, quizzes: true }
      }
    }
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const isAdmin = user?.role === Role.ADMIN;
  const isOwner = user?.id === course.instructorId;

  let enrollment = null;
  if (user) {
    enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: course.id
        }
      }
    });
  }

  const isEnrolled = enrollment !== null && enrollment.status !== EnrollmentStatus.DROPPED;

  if (course.status === CourseStatus.PUBLISHED) {
    // Publicly visible
  } else if (course.status === CourseStatus.ARCHIVED) {
    if (!isAdmin && !isOwner && !isEnrolled) {
      throw new NotFoundError("Course not found");
    }
  } else {
    // DRAFT, PENDING, REJECTED -> only owner or admin
    if (!isAdmin && !isOwner) {
      throw new NotFoundError("Course not found");
    }
  }

  const showUnpublishedLessons = isAdmin || isOwner;

  const modules = await prisma.module.findMany({
    where: { courseId: course.id },
    orderBy: { position: "asc" },
    include: {
      lessons: {
        where: showUnpublishedLessons ? undefined : { isPublished: true },
        orderBy: { position: "asc" }
      }
    }
  });

  return {
    course: {
      ...course,
      modules
    },
    enrollment
  };
}

export async function createCourse(instructorId: string, input: CreateCourseInput) {
  return prisma.course.create({
    data: {
      title: input.title,
      slug: slugify(input.title),
      description: input.description,
      category: input.category,
      difficultyLevel: input.difficultyLevel,
      thumbnailUrl: input.thumbnailUrl ?? null,
      status: CourseStatus.DRAFT,
      instructorId
    },
    include: {
      instructor: {
        select: { id: true, name: true, email: true, bio: true }
      }
    }
  });
}

export async function updateCourse(
  courseId: string,
  user: AuthenticatedUser,
  input: UpdateCourseInput
) {
  const existing = await assertCourseOwnershipOrAdmin(courseId, user);

  if (existing.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Archived courses cannot be edited");
  }

  let nextStatus = existing.status;
  let nextRejectionReason = existing.rejectionReason;

  if (existing.status === CourseStatus.REJECTED) {
    assertTransition(CourseStatus.REJECTED, CourseStatus.DRAFT);
    nextStatus = CourseStatus.DRAFT;
    nextRejectionReason = null;
  }

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.difficultyLevel !== undefined ? { difficultyLevel: input.difficultyLevel } : {}),
      ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
      status: nextStatus,
      rejectionReason: nextRejectionReason
    }
  });
}

export async function submitCourseForReview(courseId: string, user: AuthenticatedUser) {
  const existing = await assertCourseOwnershipOrAdmin(courseId, user);
  assertTransition(existing.status, CourseStatus.PENDING);

  return prisma.course.update({
    where: { id: courseId },
    data: {
      status: CourseStatus.PENDING,
      rejectionReason: null
    }
  });
}

export async function reviewCourse(courseId: string, input: ReviewCourseInput) {
  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) {
    throw new NotFoundError("Course not found");
  }

  const targetStatus =
    input.decision === "APPROVE" ? CourseStatus.PUBLISHED : CourseStatus.REJECTED;
  assertTransition(existing.status, targetStatus);

  return prisma.course.update({
    where: { id: courseId },
    data: {
      status: targetStatus,
      publishedAt: targetStatus === CourseStatus.PUBLISHED ? new Date() : existing.publishedAt,
      rejectionReason: targetStatus === CourseStatus.REJECTED ? input.rejectionReason ?? null : null
    }
  });
}

export async function archiveCourse(courseId: string, user: AuthenticatedUser) {
  const existing = await assertCourseOwnershipOrAdmin(courseId, user);
  assertTransition(existing.status, CourseStatus.ARCHIVED);

  return prisma.course.update({
    where: { id: courseId },
    data: {
      status: CourseStatus.ARCHIVED
    }
  });
}

export async function deleteOrArchiveCourse(courseId: string, user: AuthenticatedUser) {
  const existing = await assertCourseOwnershipOrAdmin(courseId, user);
  const enrollmentCount = await prisma.enrollment.count({ where: { courseId } });

  if (enrollmentCount > 0) {
    if (existing.status === CourseStatus.ARCHIVED) {
      return { deleted: false, archived: true, course: existing };
    }
    assertTransition(existing.status, CourseStatus.ARCHIVED);
    const archived = await prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED }
    });
    return { deleted: false, archived: true, course: archived };
  }

  await prisma.course.delete({ where: { id: courseId } });
  return { deleted: true, archived: false };
}

export async function listCourseStudents(courseId: string, user: AuthenticatedUser) {
  await assertCourseOwnershipOrAdmin(courseId, user);

  const [enrollments, publishedLessons] = await Promise.all([
    prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { enrolledAt: "desc" }
    }),
    prisma.lesson.findMany({
      where: {
        isPublished: true,
        module: { courseId }
      },
      select: { id: true }
    })
  ]);

  const totalLessons = publishedLessons.length;
  const publishedLessonIds = publishedLessons.map((l) => l.id);

  const progresses =
    publishedLessonIds.length > 0
      ? await prisma.lessonProgress.findMany({
          where: {
            lessonId: { in: publishedLessonIds },
            studentId: { in: enrollments.map((e) => e.studentId) }
          },
          select: { studentId: true, lessonId: true }
        })
      : [];

  const completedByStudent = new Map<string, number>();
  for (const p of progresses) {
    completedByStudent.set(p.studentId, (completedByStudent.get(p.studentId) ?? 0) + 1);
  }

  const students = enrollments.map((e) => {
    const completedLessons = completedByStudent.get(e.studentId) ?? 0;
    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    return {
      enrollmentId: e.id,
      student: e.student,
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      lastAccessedAt: e.lastAccessedAt,
      completedLessons,
      totalLessons,
      progressPercent
    };
  });

  return { students };
}
