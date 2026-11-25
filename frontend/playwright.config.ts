import { defineConfig, devices } from "@playwright/test";
import path from "path";

const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3310",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "npm --workspace=backend run dev",
      cwd: rootDir,
      url: "http://localhost:4310/api/v1/health",
      env: {
        PORT: "4310",
        CORS_ORIGIN: "http://localhost:3310"
      },
      reuseExistingServer: false,
      timeout: 30_000
    },
    {
      command: "npx --workspace=frontend next dev -p 3310",
      cwd: rootDir,
      url: "http://localhost:3310",
      env: {
        PORT: "3310",
        NEXT_PUBLIC_API_URL: "http://localhost:4310/api/v1"
      },
      reuseExistingServer: false,
      timeout: 60_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
