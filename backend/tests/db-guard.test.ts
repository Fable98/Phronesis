import { describe, expect, it } from "vitest";
import { ensureTestDatabase } from "./helpers/db";

describe("Test Database Guard", () => {
  it("refuses to run if DATABASE_URL_TEST does not end in _test", () => {
    const prev = process.env.DATABASE_URL_TEST;
    try {
      process.env.DATABASE_URL_TEST =
        "postgresql://phronesis:phronesis_dev_password@localhost:5436/phronesis?schema=public";
      expect(() => ensureTestDatabase()).toThrow(/MUST end in "_test"/);
    } finally {
      process.env.DATABASE_URL_TEST = prev;
    }
  });
});
