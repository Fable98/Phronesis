import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __phronesisPrisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__phronesisPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__phronesisPrisma = prisma;
}
