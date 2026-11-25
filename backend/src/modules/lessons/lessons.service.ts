import { CourseStatus, EnrollmentStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { CreateLessonInput, UpdateLessonInput } from "./lessons.types";

async function assertModuleOwnershipOrAdmin(moduleId: string, user: AuthenticatedUser) {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true }
  });
  if (!mod) {
    throw new NotFoundError("Module not found");
  }
  if (user.role !== Role.ADMIN && mod.course.instructorId !== user.id) {
    throw new NotFoundError("Module not found");
  }
  return mod;
}

async function assertLessonOwnershipOrAdmin(lessonId: string, user: AuthenticatedUser) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: true }
      }
    }
  });
  if (!lesson) {
    throw new NotFoundError("Lesson not found");
  }
  if (user.role !== Role.ADMIN && lesson.module.course.instructorId !== user.id) {
    throw new NotFoundError("Lesson not found");
  }
  return lesson;
}

export async function listModuleLessons(moduleId: string, user?: AuthenticatedUser) {
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true }
  });
  if (!mod) {
    throw new NotFoundError("Module not found");
  }

  const isAdmin = user?.role === Role.ADMIN;
  const isOwner = user?.id === mod.course.instructorId;

  if (mod.course.status === CourseStatus.PUBLISHED) {
    // visible
  } else if (mod.course.status === CourseStatus.ARCHIVED) {
    const enrollment = user
      ? await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: user.id, courseId: mod.courseId } }
        })
      : null;
    const isEnrolled = enrollment !== null && enrollment.status !== EnrollmentStatus.DROPPED;
    if (!isAdmin && !isOwner && !isEnrolled) {
      throw new NotFoundError("Module not found");
    }
  } else if (!isAdmin && !isOwner) {
    throw new NotFoundError("Module not found");
  }

  const showUnpublished = isAdmin || isOwner;
  return prisma.lesson.findMany({
    where: {
      moduleId,
      ...(showUnpublished ? {} : { isPublished: true })
    },
    orderBy: { position: "asc" }
  });
}

export async function getLessonById(lessonId: string, user: AuthenticatedUser) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: true }
      }
    }
  });
  if (!lesson) {
    throw new NotFoundError("Lesson not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === lesson.module.course.instructorId;

  if (!isAdmin && !isOwner) {
    if (
      !lesson.isPublished ||
      (lesson.module.course.status !== CourseStatus.PUBLISHED &&
        lesson.module.course.status !== CourseStatus.ARCHIVED)
    ) {
      throw new NotFoundError("Lesson not found");
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: lesson.module.courseId
        }
      }
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
      throw new NotFoundError("Lesson not found");
    }
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastAccessedAt: new Date() }
    });
  }

  const completed = await prisma.lessonProgress.findUnique({
    where: {
      studentId_lessonId: {
        studentId: user.id,
        lessonId: lesson.id
      }
    }
  });

  return {
    lesson,
    isCompleted: completed !== null
  };
}

export async function createLesson(
  moduleId: string,
  user: AuthenticatedUser,
  input: CreateLessonInput
) {
  const mod = await assertModuleOwnershipOrAdmin(moduleId, user);
  if (mod.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify lessons of an archived course");
  }

  const maxAgg = await prisma.lesson.aggregate({
    where: { moduleId },
    _max: { position: true }
  });
  const nextPosition = (maxAgg._max.position ?? 0) + 1;

  return prisma.lesson.create({
    data: {
      moduleId,
      title: input.title,
      content: input.content,
      videoUrl: input.videoUrl ?? null,
      durationMinutes: input.durationMinutes,
      isPublished: input.isPublished,
      position: nextPosition
    }
  });
}

export async function updateLesson(
  lessonId: string,
  user: AuthenticatedUser,
  input: UpdateLessonInput
) {
  const lesson = await assertLessonOwnershipOrAdmin(lessonId, user);
  if (lesson.module.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify lessons of an archived course");
  }

  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {})
    }
  });
}

export async function reorderLessons(
  moduleId: string,
  user: AuthenticatedUser,
  lessonIds: string[]
) {
  const mod = await assertModuleOwnershipOrAdmin(moduleId, user);
  if (mod.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot reorder lessons of an archived course");
  }

  const existing = await prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { position: "asc" },
    select: { id: true }
  });

  const existingSet = new Set(existing.map((l) => l.id));
  const inputSet = new Set(lessonIds);
  if (existingSet.size !== inputSet.size || lessonIds.length !== existing.length) {
    throw new BadRequestError("lessonIds must match the exact set of lessons in the module");
  }
  for (const id of lessonIds) {
    if (!existingSet.has(id)) {
      throw new BadRequestError("lessonIds contains an invalid lesson id for this module");
    }
  }

  await prisma.$transaction(async (tx) => {
    const tempOffset = 10000;
    for (let i = 0; i < lessonIds.length; i++) {
      await tx.lesson.update({
        where: { id: lessonIds[i]! },
        data: { position: tempOffset + i + 1 }
      });
    }
    for (let i = 0; i < lessonIds.length; i++) {
      await tx.lesson.update({
        where: { id: lessonIds[i]! },
        data: { position: i + 1 }
      });
    }
  });

  return prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { position: "asc" }
  });
}

export async function deleteLesson(lessonId: string, user: AuthenticatedUser) {
  const lesson = await assertLessonOwnershipOrAdmin(lessonId, user);
  if (lesson.module.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot delete lessons of an archived course");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lessonId } });
    const remaining = await tx.lesson.findMany({
      where: { moduleId: lesson.moduleId },
      orderBy: { position: "asc" },
      select: { id: true }
    });
    const tempOffset = 10000;
    for (let i = 0; i < remaining.length; i++) {
      await tx.lesson.update({
        where: { id: remaining[i]!.id },
        data: { position: tempOffset + i + 1 }
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.lesson.update({
        where: { id: remaining[i]!.id },
        data: { position: i + 1 }
      });
    }
  });
}
