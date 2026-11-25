import { expect, test } from "@playwright/test";

test("Full LMS journey: register, browse, enroll, lesson, assignment, quiz, instructor grade, student sees grade", async ({
  page
}) => {
  const uniqueEmail = `e2e.student.${Date.now()}@phronesis.edu`;
  const password = "Password123!";
  const studentName = "E2E Portfolio Student";

  // 1. Register as Student
  await page.goto("/register");
  await page.getByLabel("Full name").fill(studentName);
  await page.getByLabel("Email address").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByRole("heading", { name: "Student Dashboard" })).toBeVisible();

  // 2. Browse Catalog & select TypeScript & Node.js course
  await page.goto("/courses");
  await page.getByLabel("Search courses").fill("TypeScript");
  const courseCard = page.getByRole("link", {
    name: /TypeScript & Node\.js Backend Architecture/i
  });
  await expect(courseCard).toBeVisible();
  await courseCard.click();

  // 3. Enroll
  await expect(page).toHaveURL(/\/courses\/.+/);
  await page.getByRole("button", { name: "Enroll in Course" }).click();
  await expect(page).toHaveURL(/\/student\/courses\/.+\/learn/);

  // 4. Complete first lesson
  await page.getByRole("button", { name: "Mark Complete" }).click();
  await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();
  await expect(page.getByText("17%")).toBeVisible();

  // 5. Submit Assignment
  await page.getByRole("button", { name: "Assignments" }).click();
  await page
    .getByPlaceholder("Write your assignment response...")
    .fill("E2E assignment submission covering layered architecture.");
  await page.getByRole("button", { name: "Submit Assignment" }).click();
  await expect(page.getByText("Latest Submission (Attempt #1)")).toBeVisible();

  // 6. Take Quiz
  await page.getByRole("button", { name: "Quizzes" }).click();
  await page.getByRole("button", { name: "Start / Resume Quiz" }).click();
  await expect(page.getByText("Quiz in Progress")).toBeVisible();

  // Select first option for each radio group
  const questionGroups = page.locator('[data-testid="quiz-question"]');
  const count = await questionGroups.count();
  for (let i = 0; i < count; i++) {
    await questionGroups.nth(i).locator('input[type="radio"]').first().check();
  }
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText(/Result:/)).toBeVisible();

  // 7. Sign out & Instructor grades the submission
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email address").fill("marcus.chen@phronesis.edu");
  await page.getByLabel("Password").fill("Phronesis123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/instructor$/);

  await page.getByRole("link", { name: "Grade Submissions" }).click();
  await expect(page).toHaveURL(/\/instructor\/submissions/);

  const targetCard = page
    .locator('[data-testid="submission-card"]')
    .filter({ hasText: uniqueEmail })
    .first();
  await expect(targetCard).toBeVisible();
  await targetCard.locator('input[type="number"]').fill("95");
  await targetCard.getByPlaceholder("Constructive feedback...").fill("Excellent E2E work");
  await targetCard.getByRole("button", { name: /Save Grade|Update Grade/ }).click();
  await expect(page.getByText("Submission graded successfully!")).toBeVisible();

  // 8. Student signs back in and sees grade + updated progress
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email address").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student$/);

  await expect(page.getByText("17%").first()).toBeVisible();
  await page.getByRole("link", { name: "Grades & Quizzes" }).click();
  await expect(page.getByText("95 / 100")).toBeVisible();
  await expect(page.getByText("Excellent E2E work")).toBeVisible();
});
