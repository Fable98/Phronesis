import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://phronesis:phronesis_dev_password@localhost:5436/phronesis_test";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-session-secret-at-least-32-chars";
});

describe("Health endpoint", () => {
  it("returns 200 ok", async () => {
    const { createApp } = await import("../src/app");
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe("phronesis-api");
  });
});
