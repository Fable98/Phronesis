import { describe, it, expect } from "vitest";
import request from "supertest";
import { ensureTestDatabase } from "./helpers/db";

ensureTestDatabase();

import { createApp } from "../src/app";

describe("Health endpoint", () => {
  it("returns 200 ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe("phronesis-api");
  });
});
