import { CourseStatus, EnrollmentStatus, Role, SubmissionStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AuthenticatedUser } from "../../types/express";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/errors";
import { CreateSubmissionInput, GradeSubmissionInput } from "./submissions.types";

export async function createSubmission(
  assignmentId: string,
  studentId: string,
  input: CreateSubmissionInput
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true }
  });

  if (
    !assignment ||
    !assignment.isPublished ||
    (assignment.course.status !== CourseStatus.PUBLISHED &&
      assignment.course.status !== CourseStatus.ARCHIVED)
  ) {
    throw new NotFoundError("Assignment not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId,
        courseId: assignment.courseId
      }
    }
  });

  if (!enrollment || enrollment.status === EnrollmentStatus.DROPPED) {
    throw new NotFoundError("You must be enrolled in this course to submit");
  }

  const now = new Date();
  let isLate = false;
  if (assignment.dueDate && now > assignment.dueDate) {
    if (!assignment.allowLateSubmission) {
      throw new ConflictError("Submission deadline has passed and late submissions are disabled");
    }
    isLate = true;
  }

  if (input.fileId) {
    const file = await prisma.storedFile.findUnique({ where: { id: input.fileId } });
    if (!file || file.uploadedById !== studentId) {
      throw new NotFoundError("Uploaded file not found");
    }
  }

  const existingCount = await prisma.submission.count({
    where: { assignmentId, studentId }
  });

  if (existingCount > 0) {
    if (!assignment.allowResubmission) {
      throw new ConflictError("Resubmissions are not allowed for this assignment");
    }
    if (existingCount >= 1 + assignment.maxResubmissions) {
      throw new ConflictError(
        `Maximum number of resubmissions (${assignment.maxResubmissions}) reached`
      );
    }
  }

  const attemptNumber = existingCount + 1;

  return prisma.submission.create({
    data: {
      assignmentId,
      studentId,
      content: input.content ?? null,
      fileId: input.fileId ?? null,
      attemptNumber,
      isLate,
      status: SubmissionStatus.SUBMITTED
    },
    include: {
      file: {
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true }
      }
    }
  });
}

export async function listSubmissionsForAssignment(
  assignmentId: string,
  user: AuthenticatedUser
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true }
  });
  if (!assignment) {
    throw new NotFoundError("Assignment not found");
  }

  const isAdmin = user.role === Role.ADMIN;
  const isOwner = user.id === assignment.course.instructorId;

  if (isAdmin || isOwner) {
    return prisma.submission.findMany({
      where: { assignmentId },
      orderBy: [{ submittedAt: "desc" }, { attemptNumber: "desc" }],
      include: {
        student: { select: { id: true, name: true, email: true } },
        file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
      }
    });
  }

  // Student sees only own submissions if enrolled
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

  return prisma.submission.findMany({
    where: { assignmentId, studentId: user.id },
    orderBy: { attemptNumber: "desc" },
    include: {
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
    }
  });
}

export async function listMySubmissions(studentId: string) {
  return prisma.submission.findMany({
    where: { studentId },
    orderBy: { submittedAt: "desc" },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          dueDate: true,
          course: { select: { id: true, title: true } }
        }
      },
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
    }
  });
}

export async function listInstructorSubmissions(instructorId: string) {
  return prisma.submission.findMany({
    where: {
      assignment: {
        course: { instructorId }
      }
    },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: {
      student: { select: { id: true, name: true, email: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          course: { select: { id: true, title: true } }
        }
      },
      file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
    }
  });
}

export async function gradeSubmission(
  submissionId: string,
  instructorId: string,
  input: GradeSubmissionInput
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { course: true }
      }
    }
  });

  if (!submission || submission.assignment.course.instructorId !== instructorId) {
    throw new NotFoundError("Submission not found");
  }

  if (input.score < 0 || input.score > submission.assignment.maxScore) {
    throw new BadRequestError(
      `Score must be between 0 and ${submission.assignment.maxScore}`
    );
  }

  return prisma.submission.update({
    where: { id: submissionId },
    data: {
      score: input.score,
      feedback: input.feedback ?? null,
      status: SubmissionStatus.GRADED,
      gradedById: instructorId,
      gradedAt: new Date()
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      assignment: { select: { id: true, title: true, maxScore: true } }
    }
  });
}
