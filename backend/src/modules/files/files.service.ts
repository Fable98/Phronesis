import crypto from "crypto";
import { EnrollmentStatus, Role } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { LocalDiskStorage } from "../../storage/localDisk.storage";
import { StorageProvider } from "../../storage/storage.interface";
import { AuthenticatedUser } from "../../types/express";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import { detectMagicBytes, validateFilenameSafety } from "../../utils/magicBytes";
import { assertCourseOwnershipOrAdmin } from "../courses/courses.service";
import { AttachCourseMaterialInput, UploadedFileMetadata } from "./files.types";

export const storageProvider: StorageProvider = new LocalDiskStorage(env.UPLOAD_DIR);

export async function uploadFile(
  file: Express.Multer.File | undefined,
  user: AuthenticatedUser
): Promise<UploadedFileMetadata> {
  if (!file) {
    throw new BadRequestError("No file provided");
  }

  let safeMeta: { safeBasename: string; ext: string };
  try {
    safeMeta = validateFilenameSafety(file.originalname);
  } catch (err) {
    throw new BadRequestError(err instanceof Error ? err.message : "Invalid filename");
  }

  const detected = detectMagicBytes(file.buffer);
  if (!detected) {
    throw new BadRequestError("File content does not match allowed types (PDF, PNG, JPEG)");
  }

  const expectedExtMime =
    safeMeta.ext === ".pdf"
      ? "application/pdf"
      : safeMeta.ext === ".png"
        ? "image/png"
        : "image/jpeg";

  if (detected.mimeType !== expectedExtMime) {
    throw new BadRequestError("File extension does not match actual file signature");
  }

  const storageKey = `${crypto.randomUUID()}.${detected.extension}`;
  await storageProvider.put({
    key: storageKey,
    buffer: file.buffer,
    contentType: detected.mimeType
  });

  const record = await prisma.storedFile.create({
    data: {
      originalName: safeMeta.safeBasename,
      storageKey,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
      uploadedById: user.id
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true
    }
  });

  return record;
}

export async function getAuthorizedFileStream(fileId: string, user: AuthenticatedUser) {
  const file = await prisma.storedFile.findUnique({
    where: { id: fileId },
    include: {
      courseMaterials: {
        include: {
          course: {
            select: { id: true, instructorId: true }
          }
        }
      },
      submissions: {
        include: {
          assignment: {
            include: {
              course: {
                select: { id: true, instructorId: true }
              }
            }
          }
        }
      }
    }
  });

  if (!file) {
    throw new NotFoundError("File not found");
  }

  let authorized = user.role === Role.ADMIN;

  if (!authorized && file.courseMaterials.length > 0) {
    for (const material of file.courseMaterials) {
      if (material.course.instructorId === user.id) {
        authorized = true;
        break;
      }
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: user.id,
            courseId: material.course.id
          }
        }
      });
      if (enrollment && enrollment.status !== EnrollmentStatus.DROPPED) {
        authorized = true;
        break;
      }
    }
  }

  if (!authorized && file.submissions.length > 0) {
    for (const sub of file.submissions) {
      if (sub.studentId === user.id || sub.assignment.course.instructorId === user.id) {
        authorized = true;
        break;
      }
    }
  }

  // If unattached yet, only uploader may access
  if (
    !authorized &&
    file.courseMaterials.length === 0 &&
    file.submissions.length === 0 &&
    file.uploadedById === user.id
  ) {
    authorized = true;
  }

  if (!authorized) {
    throw new NotFoundError("File not found");
  }

  const stream = await storageProvider.getStream(file.storageKey);
  return {
    stream,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes
  };
}

export async function attachCourseMaterial(
  courseId: string,
  user: AuthenticatedUser,
  input: AttachCourseMaterialInput
) {
  await assertCourseOwnershipOrAdmin(courseId, user);
  const file = await prisma.storedFile.findUnique({ where: { id: input.fileId } });
  if (!file) {
    throw new NotFoundError("Uploaded file not found");
  }
  if (user.role !== Role.ADMIN && file.uploadedById !== user.id) {
    throw new NotFoundError("Uploaded file not found");
  }

  return prisma.courseMaterial.create({
    data: {
      courseId,
      fileId: input.fileId,
      title: input.title
    },
    include: {
      file: {
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true }
      }
    }
  });
}

export async function removeCourseMaterial(
  courseId: string,
  materialId: string,
  user: AuthenticatedUser
) {
  await assertCourseOwnershipOrAdmin(courseId, user);
  const material = await prisma.courseMaterial.findUnique({
    where: { id: materialId }
  });
  if (!material || material.courseId !== courseId) {
    throw new NotFoundError("Course material not found");
  }
  await prisma.courseMaterial.delete({ where: { id: materialId } });
}
