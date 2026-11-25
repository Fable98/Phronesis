import { CourseStatus, EnrollmentStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { assertCourseOwnershipOrAdmin } from "../courses/courses.service";
import { CreateModuleInput, UpdateModuleInput } from "./modules.types";

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

export async function listCourseModules(courseId: string, user?: AuthenticatedUser) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new NotFoundError("Course not found");
  }

  const isAdmin = user?.role === Role.ADMIN;
  const isOwner = user?.id === course.instructorId;

  if (course.status === CourseStatus.PUBLISHED) {
    // visible
  } else if (course.status === CourseStatus.ARCHIVED) {
    const enrollment = user
      ? await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: user.id, courseId } }
        })
      : null;
    const isEnrolled = enrollment !== null && enrollment.status !== EnrollmentStatus.DROPPED;
    if (!isAdmin && !isOwner && !isEnrolled) {
      throw new NotFoundError("Course not found");
    }
  } else if (!isAdmin && !isOwner) {
    throw new NotFoundError("Course not found");
  }

  const showUnpublished = isAdmin || isOwner;
  return prisma.module.findMany({
    where: { courseId },
    orderBy: { position: "asc" },
    include: {
      lessons: {
        where: showUnpublished ? undefined : { isPublished: true },
        orderBy: { position: "asc" }
      }
    }
  });
}

export async function createModule(
  courseId: string,
  user: AuthenticatedUser,
  input: CreateModuleInput
) {
  const course = await assertCourseOwnershipOrAdmin(courseId, user);
  if (course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify modules of an archived course");
  }

  const maxAgg = await prisma.module.aggregate({
    where: { courseId },
    _max: { position: true }
  });
  const nextPosition = (maxAgg._max.position ?? 0) + 1;

  return prisma.module.create({
    data: {
      courseId,
      title: input.title,
      description: input.description ?? null,
      position: nextPosition
    }
  });
}

export async function updateModule(
  moduleId: string,
  user: AuthenticatedUser,
  input: UpdateModuleInput
) {
  const mod = await assertModuleOwnershipOrAdmin(moduleId, user);
  if (mod.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot modify modules of an archived course");
  }

  return prisma.module.update({
    where: { id: moduleId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {})
    }
  });
}

export async function reorderModules(
  courseId: string,
  user: AuthenticatedUser,
  moduleIds: string[]
) {
  const course = await assertCourseOwnershipOrAdmin(courseId, user);
  if (course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot reorder modules of an archived course");
  }

  const existing = await prisma.module.findMany({
    where: { courseId },
    orderBy: { position: "asc" },
    select: { id: true }
  });

  const existingSet = new Set(existing.map((m) => m.id));
  const inputSet = new Set(moduleIds);
  if (existingSet.size !== inputSet.size || moduleIds.length !== existing.length) {
    throw new BadRequestError("moduleIds must match the exact set of modules in the course");
  }
  for (const id of moduleIds) {
    if (!existingSet.has(id)) {
      throw new BadRequestError("moduleIds contains an invalid module id for this course");
    }
  }

  await prisma.$transaction(async (tx) => {
    const tempOffset = 10000;
    for (let i = 0; i < moduleIds.length; i++) {
      await tx.module.update({
        where: { id: moduleIds[i]! },
        data: { position: tempOffset + i + 1 }
      });
    }
    for (let i = 0; i < moduleIds.length; i++) {
      await tx.module.update({
        where: { id: moduleIds[i]! },
        data: { position: i + 1 }
      });
    }
  });

  return prisma.module.findMany({
    where: { courseId },
    orderBy: { position: "asc" }
  });
}

export async function deleteModule(moduleId: string, user: AuthenticatedUser) {
  const mod = await assertModuleOwnershipOrAdmin(moduleId, user);
  if (mod.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot delete modules of an archived course");
  }

  await prisma.$transaction(async (tx) => {
    await tx.module.delete({ where: { id: moduleId } });
    const remaining = await tx.module.findMany({
      where: { courseId: mod.courseId },
      orderBy: { position: "asc" },
      select: { id: true }
    });
    const tempOffset = 10000;
    for (let i = 0; i < remaining.length; i++) {
      await tx.module.update({
        where: { id: remaining[i]!.id },
        data: { position: tempOffset + i + 1 }
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.module.update({
        where: { id: remaining[i]!.id },
        data: { position: i + 1 }
      });
    }
  });
}
