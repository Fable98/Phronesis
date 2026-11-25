import { CourseStatus, EnrollmentStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { assertCourseOwnershipOrAdmin } from "../courses/courses.service";
import { CreateAssignmentInput, UpdateAssignmentInput } from "./assignments.types";

async function assertAssignmentOwnershipOrAdmin(assignmentId: string, user: AuthenticatedUser) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true }
  });
  if (!assignment) {
    throw new NotFoundError("Assignment not found");
  }
  if (user.role !== Role.ADMIN && assignment.course.instructorId !== user.id) {
    throw new NotFoundError("Assignment not found");
  }
  return assignment;
}

export async function listCourseAssignments(courseId: string, user: AuthenticatedUser) {
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

  const showUnpublished = isAdmin || isOwner;
  return prisma.assignment.findMany({
    where: {
      courseId,
      ...(showUnpublished ? {} : { isPublished: true })
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { submissions: true } },
      ...(user.role === Role.STUDENT
        ? {
            submissions: {
              where: { studentId: user.id },
              orderBy: { attemptNumber: "desc" },
              include: {
                file: {
                  select: { id: true, originalName: true, mimeType: true, sizeBytes: true }
                }
              }
            }
          }
        : {})
    }
  });
}

export async function getAssignmentById(assignmentId: string, user: AuthenticatedUser) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true }
  });
  if (!assignment) {
    throw new NotFoundError("Assignment not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === assignment.course.instructorId;

  if (!isAdmin && !isOwner) {
    if (
      !assignment.isPublished ||
      (assignment.course.status !== CourseStatus.PUBLISHED &&
        assignment.course.status !== CourseStatus.ARCHIVED)
    ) {
      throw new NotFoundError("Assignment not found");
    }
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: assignment.courseId
        }
      }
    });
    if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
      throw new NotFoundError("Assignment not found");
    }
  }

  const mySubmissions =
    user.role === Role.STUDENT
      ? await prisma.submission.findMany({
          where: { assignmentId: assignment.id, studentId: user.id },
          orderBy: { attemptNumber: "desc" },
          include: {
            file: {
              select: { id: true, originalName: true, mimeType: true, sizeBytes: true }
            }
          }
        })
      : undefined;

  return { assignment, ...(mySubmissions ? { mySubmissions } : {}) };
}

export async function createAssignment(
  courseId: string,
  user: AuthenticatedUser,
  input: CreateAssignmentInput
) {
  const course = await assertCourseOwnershipOrAdmin(courseId, user);
  if (course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot add assignments to an archived course");
  }

  return prisma.assignment.create({
    data: {
      courseId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      maxScore: input.maxScore,
      allowResubmission: input.allowResubmission,
      maxResubmissions: input.allowResubmission ? input.maxResubmissions : 0,
      allowLateSubmission: input.allowLateSubmission,
      isPublished: input.isPublished
    }
  });
}

export async function updateAssignment(
  assignmentId: string,
  user: AuthenticatedUser,
  input: UpdateAssignmentInput
) {
  const existing = await assertAssignmentOwnershipOrAdmin(assignmentId, user);
  if (existing.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot update assignments of an archived course");
  }

  return prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
      ...(input.maxScore !== undefined ? { maxScore: input.maxScore } : {}),
      ...(input.allowResubmission !== undefined
        ? { allowResubmission: input.allowResubmission }
        : {}),
      ...(input.maxResubmissions !== undefined
        ? { maxResubmissions: input.maxResubmissions }
        : {}),
      ...(input.allowLateSubmission !== undefined
        ? { allowLateSubmission: input.allowLateSubmission }
        : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {})
    }
  });
}

export async function deleteAssignment(assignmentId: string, user: AuthenticatedUser) {
  const existing = await assertAssignmentOwnershipOrAdmin(assignmentId, user);
  if (existing.course.status === CourseStatus.ARCHIVED) {
    throw new ConflictError("Cannot delete assignments of an archived course");
  }
  await prisma.assignment.delete({ where: { id: assignmentId } });
}
