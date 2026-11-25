import dotenv from "dotenv";

dotenv.config();

export function ensureTestDatabase(): string {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error("DATABASE_URL_TEST must be set to run backend tests.");
  }

  let dbName = "";
  try {
    const parsed = new URL(testUrl);
    dbName = parsed.pathname.replace(/^\//, "");
  } catch {
    throw new Error(`Invalid DATABASE_URL_TEST format: ${testUrl}`);
  }

  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against database "${dbName}". Test database name MUST end in "_test".`
    );
  }

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = testUrl;
  return testUrl;
}
