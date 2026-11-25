import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { hashPassword } from "../../utils/password";
import { buildPaginationMeta, PaginationMeta } from "../../utils/response";
import {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UserSummary
} from "./users.types";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  bio: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

async function ensureNotLastAdmin(userId: string): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new NotFoundError("User not found");
  }
  if (target.role !== Role.ADMIN || !target.isActive) {
    return;
  }
  const activeAdmins = await prisma.user.count({
    where: { role: Role.ADMIN, isActive: true }
  });
  if (activeAdmins <= 1) {
    throw new ConflictError("Cannot demote, deactivate, or delete the last remaining active admin");
  }
}

export async function listUsers(
  query: ListUsersQuery
): Promise<{ users: UserSummary[]; meta: PaginationMeta }> {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const skip = (query.page - 1) * query.pageSize;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize
    }),
    prisma.user.count({ where })
  ]);

  return {
    users,
    meta: buildPaginationMeta(query.page, query.pageSize, total)
  };
}

export async function getUserById(userId: string): Promise<UserSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name,
      role: input.role,
      bio: input.bio ?? null
    },
    select: userSelect
  });
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<UserSummary> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  const willDemote = input.role !== undefined && input.role !== Role.ADMIN && existing.role === Role.ADMIN;
  const willDeactivate = input.isActive === false && existing.isActive && existing.role === Role.ADMIN;

  if (willDemote || willDeactivate) {
    await ensureNotLastAdmin(userId);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.role !== undefined ? { role: input.role } : {})
    },
    select: userSelect
  });
}

export async function updateUserRole(userId: string, role: Role): Promise<UserSummary> {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  if (existing.role === Role.ADMIN && role !== Role.ADMIN) {
    await ensureNotLastAdmin(userId);
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: userSelect
  });
}

export async function deleteUser(userId: string): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { coursesTaught: true } } }
  });
  if (!existing) {
    throw new NotFoundError("User not found");
  }

  if (existing.role === Role.ADMIN) {
    await ensureNotLastAdmin(userId);
  }

  if (existing._count.coursesTaught > 0) {
    throw new ConflictError("Cannot delete an instructor who owns courses; deactivate the user instead");
  }

  await prisma.user.delete({ where: { id: userId } });
}
