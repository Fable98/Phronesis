# Phronesis

**Phronesis** is a production-grade, role-based Learning Management System (LMS) built with Next.js (App Router), Express, TypeScript, Prisma, and PostgreSQL. It supports three distinct roles (`ADMIN`, `INSTRUCTOR`, `STUDENT`) with real server-side sessions, double-submit CSRF protection, transactional curriculum reordering, magic-byte-verified file storage, assignment grading workflows, a timed quiz engine, and live analytics dashboards.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Stack](#stack)
- [Architecture](#architecture)
- [Entity-Relationship Diagram](#entity-relationship-diagram)
- [API Reference](#api-reference)
- [Auth and CSRF Design](#auth-and-csrf-design)
- [Roles Matrix](#roles-matrix)
- [Course Lifecycle](#course-lifecycle)
- [Assignment Workflow](#assignment-workflow)
- [Quiz Grading](#quiz-grading)
- [Progress Calculation](#progress-calculation)
- [Setup](#setup)
- [Testing](#testing)
- [Production Build](#production-build)
- [Deployment Notes](#deployment-notes)
- [Decisions](#decisions)
- [Known Limitations](#known-limitations)

---

## Overview
Phronesis provides end-to-end course authoring, administrative moderation, student enrollment, lesson progression, assignment submission/grading, and automated quiz evaluation. Every UI screen interacts directly with the Express + Prisma backend under `/api/v1`.

## Features
- **Public Catalog**: Browse, search, filter (category, difficulty), sort, and paginate published courses; inspect syllabi and instructor bios.
- **Student Portal (`/student/*`)**:
  - Analytics dashboard with Recharts completion chart and **Continue Learning** CTA driven by `lastAccessedAt`.
  - Course player with module/lesson sidebar, completion checkmarks, video embed, idempotent **Mark Complete**, and Next/Previous lesson navigation.
  - Assignment submission (text + magic-byte-verified PDF/PNG/JPEG upload) with resubmission and late-policy enforcement.
  - Timed quiz runner with live countdown, server-enforced `expiresAt`, and post-submission answer breakdown.
  - Unified Grades & Quiz History page.
- **Instructor Studio (`/instructor/*`)**:
  - Analytics dashboard with Recharts enrollment vs. completion chart and grading queue counter.
  - Course Editor supporting metadata updates, module/lesson CRUD, transactional up/down reordering, material file uploads, assignment/quiz/question authoring, student progress roster, and submit-for-approval / archive actions.
  - Grading Inbox to score (`0..maxScore`) and leave feedback on student submissions.
- **Admin Console (`/admin/*`)**:
  - Platform analytics dashboard across users, course statuses, enrollments, and assessments.
  - User & role administration (create users, promote/demote roles, activate/deactivate, delete) with last-admin protection.
  - Course moderation queue (`APPROVE` / `REJECT` with reason / `ARCHIVE`).
  - Platform-wide enrollments explorer.

## Stack
- **Frontend**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Recharts, Lucide React.
- **Backend**: Node.js 20, Express 4, TypeScript, Zod, Helmet, CORS, `express-rate-limit`, `cookie-parser`, `multer`, Argon2id (`argon2`).
- **Database**: PostgreSQL 16 + Prisma ORM (`@prisma/client` v6).
- **Testing**: Vitest + Supertest (isolated `_test` DB) and Playwright (end-to-end browser journey).
- **Infrastructure**: Docker Compose (PostgreSQL).

## Architecture
```text
phronesis/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/          # Zod env validation, Prisma singleton
│   │   ├── middleware/      # auth, rbac, csrf, rateLimit, validate, errorHandler
│   │   ├── modules/         # auth, users, courses, modules, lessons, enrollments,
│   │   │                    # progress, assignments, submissions, quizzes, analytics, files
│   │   ├── storage/         # StorageProvider interface, LocalDiskStorage, S3StorageStub
│   │   ├── utils/           # AppError hierarchy, asyncHandler, magicBytes, password, response
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/               # Vitest + Supertest integration suites
├── frontend/
│   ├── e2e/                 # Playwright end-to-end journey
│   └── src/
│       ├── app/             # Public, /student/*, /instructor/*, /admin/* routes
│       ├── components/      # Navbar, DashboardShell, RoleGuard, Providers, UiStates
│       └── lib/             # API client (auto-CSRF), Zod schemas, TypeScript types
├── docker/postgres/         # Init SQL creating phronesis_test alongside phronesis
├── docker-compose.yml
└── package.json             # npm workspaces root
```

Each backend module follows `routes -> controller -> service` with Zod schemas and TypeScript types. Controllers only parse requests and send `{ success, data, meta? }` envelopes; all authorization, ownership checks, and business rules reside in services.

## Entity-Relationship Diagram
```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Course : teaches
    User ||--o{ Enrollment : enrolls
    User ||--o{ LessonProgress : completes
    User ||--o{ Submission : submits
    User ||--o{ QuizAttempt : attempts
    User ||--o{ StoredFile : uploads

    Course ||--o{ Module : contains
    Course ||--o{ Enrollment : has
    Course ||--o{ Assignment : has
    Course ||--o{ Quiz : has
    Course ||--o{ CourseMaterial : includes

    Module ||--o{ Lesson : contains
    Lesson ||--o{ LessonProgress : tracked_by

    StoredFile ||--o{ CourseMaterial : backs
    StoredFile ||--o{ Submission : attaches_to

    Assignment ||--o{ Submission : receives
    Enrollment ||--o{ QuizAttempt : authorizes

    Quiz ||--o{ Question : contains
    Quiz ||--o{ QuizAttempt : has
    Question ||--o{ QuizOption : offers
    Question ||--o{ QuizAnswer : answered_by
    QuizOption ||--o{ QuizAnswer : selected_in
    QuizAttempt ||--o{ QuizAnswer : records
```

## API Reference
All endpoints are mounted under `/api/v1`. Responses use `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

| Domain | Method & Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| Health | `GET /health` | Public | API health check |
| Auth | `GET /auth/csrf` | Public | Issue/refresh CSRF cookie and token |
| Auth | `POST /auth/register` | Public | Register `STUDENT` (rejects any `role` field) |
| Auth | `POST /auth/login` | Public (rate-limited) | Verify Argon2id password, rotate session |
| Auth | `POST /auth/logout` | Session | Delete session row and clear cookie |
| Auth | `GET /auth/me` | Authenticated | Current user profile + CSRF token |
| Auth | `PATCH /auth/me` | Authenticated | Update own name or bio |
| Users | `GET /users` | `ADMIN` | List/filter/paginate users |
| Users | `POST /users` | `ADMIN` | Create user with any role |
| Users | `GET /users/:id` | `ADMIN` | Fetch user details |
| Users | `PATCH /users/:id` | `ADMIN` | Update user (last-admin protected) |
| Users | `PATCH /users/:id/role` | `ADMIN` | Change role (last-admin protected) |
| Users | `DELETE /users/:id` | `ADMIN` | Delete user (last-admin protected) |
| Courses | `GET /courses` | OptionalAuth | Published courses (or `mine=true` / `scope=admin`) |
| Courses | `GET /courses/:id` | OptionalAuth | Course syllabus & materials (visibility enforced) |
| Courses | `POST /courses` | `INSTRUCTOR`, `ADMIN` | Create `DRAFT` course |
| Courses | `PATCH /courses/:id` | Owner, `ADMIN` | Update course (`REJECTED -> DRAFT` on edit) |
| Courses | `POST /courses/:id/submit` | Owner, `ADMIN` | Submit `DRAFT -> PENDING` |
| Courses | `PATCH /courses/:id/review` | `ADMIN` | Approve (`PUBLISHED`) or Reject (`REJECTED` + reason) |
| Courses | `POST /courses/:id/archive` | Owner, `ADMIN` | Transition course to `ARCHIVED` |
| Courses | `DELETE /courses/:id` | Owner, `ADMIN` | Delete if no enrollments; archive otherwise |
| Courses | `GET /courses/:id/students` | Owner, `ADMIN` | Enrolled student roster with progress % |
| Modules | `GET /courses/:courseId/modules` | OptionalAuth | List course modules & lessons |
| Modules | `POST /courses/:courseId/modules` | Owner, `ADMIN` | Create module |
| Modules | `PATCH /courses/:courseId/modules/reorder` | Owner, `ADMIN` | Transactional module position reorder |
| Modules | `PATCH /modules/:id` | Owner, `ADMIN` | Update module |
| Modules | `DELETE /modules/:id` | Owner, `ADMIN` | Delete module & compact positions |
| Lessons | `GET /modules/:moduleId/lessons` | OptionalAuth | List module lessons |
| Lessons | `POST /modules/:moduleId/lessons` | Owner, `ADMIN` | Create lesson |
| Lessons | `PATCH /modules/:moduleId/lessons/reorder` | Owner, `ADMIN` | Transactional lesson position reorder |
| Lessons | `GET /lessons/:id` | Enrolled / Owner / `ADMIN` | Fetch lesson & update `lastAccessedAt` |
| Lessons | `PATCH /lessons/:id` | Owner, `ADMIN` | Update lesson |
| Lessons | `DELETE /lessons/:id` | Owner, `ADMIN` | Delete lesson & compact positions |
| Enrollments | `POST /enrollments` | `STUDENT` | Enroll in `PUBLISHED` course |
| Enrollments | `GET /enrollments/my` | `STUDENT` | My active/completed enrollments + progress |
| Enrollments | `GET /enrollments` | `ADMIN` | Paginated platform enrollments |
| Enrollments | `PATCH /enrollments/:id/drop` | `STUDENT` | Drop own enrollment |
| Progress | `POST /lessons/:lessonId/complete` | `STUDENT` | Idempotent completion + 100% check |
| Progress | `GET /courses/:courseId/progress` | Enrolled / Owner / `ADMIN` | Server-computed completion % |
| Files | `POST /files` | Authenticated | Upload PDF/PNG/JPEG (magic bytes verified) |
| Files | `GET /files/:id` | Authorized | Stream file after material/submission ACL check |
| Materials | `POST /courses/:courseId/materials` | Owner, `ADMIN` | Attach uploaded file to course |
| Materials | `DELETE /courses/:courseId/materials/:materialId` | Owner, `ADMIN` | Detach course material |
| Assignments | `GET /courses/:courseId/assignments` | Enrolled / Owner / `ADMIN` | List assignments |
| Assignments | `POST /courses/:courseId/assignments` | Owner, `ADMIN` | Create assignment |
| Assignments | `GET /assignments/:id` | Enrolled / Owner / `ADMIN` | Assignment detail + own submissions |
| Assignments | `PATCH /assignments/:id` | Owner, `ADMIN` | Update assignment |
| Assignments | `DELETE /assignments/:id` | Owner, `ADMIN` | Delete assignment |
| Submissions | `POST /assignments/:assignmentId/submissions` | `STUDENT` | Submit work (late & resubmission checks) |
| Submissions | `GET /assignments/:assignmentId/submissions` | Enrolled / Owner / `ADMIN` | List submissions (student sees own only) |
| Submissions | `GET /submissions/my` | `STUDENT` | All own submissions across courses |
| Submissions | `GET /submissions/instructor` | `INSTRUCTOR` | All submissions for instructor's courses |
| Submissions | `PATCH /submissions/:id/grade` | Owning `INSTRUCTOR` | Grade submission (`0..maxScore`) |
| Quizzes | `GET /courses/:courseId/quizzes` | Enrolled / Owner / `ADMIN` | List quizzes |
| Quizzes | `POST /courses/:courseId/quizzes` | Owner, `ADMIN` | Create quiz |
| Quizzes | `GET /quizzes/:id` | Enrolled / Owner / `ADMIN` | Quiz questions (`isCorrect` stripped for students) |
| Quizzes | `PATCH /quizzes/:id` | Owner, `ADMIN` | Update quiz |
| Quizzes | `DELETE /quizzes/:id` | Owner, `ADMIN` | Delete quiz |
| Quizzes | `POST /quizzes/:id/questions` | Owner, `ADMIN` | Add question & options |
| Quizzes | `DELETE /questions/:id` | Owner, `ADMIN` | Delete question & compact positions |
| Quizzes | `POST /quizzes/:id/attempts` | `STUDENT` | Start timed attempt (1 `IN_PROGRESS` max) |
| Quizzes | `PUT /attempts/:id/answers` | `STUDENT` | Save in-progress answers |
| Quizzes | `POST /attempts/:id/submit` | `STUDENT` | Submit & server-grade attempt |
| Quizzes | `GET /attempts/:id/result` | Owner Student / Instructor / `ADMIN` | View breakdown (after submission) |
| Quizzes | `GET /attempts/my` | `STUDENT` | Student's quiz attempt history |
| Analytics | `GET /analytics/platform` | `ADMIN` | Platform KPIs & chart series |
| Analytics | `GET /analytics/instructor` | `INSTRUCTOR`, `ADMIN` | Instructor KPIs & per-course stats |
| Analytics | `GET /analytics/student` | `STUDENT` | Student KPIs, continue learning & progress |

## Auth and CSRF Design
- **Passwords**: Hashed with Argon2id (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`).
- **Sessions**: Random 256-bit opaque token stored in the PostgreSQL `Session` table with 7-day expiry, transmitted in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie (`phronesis_session`). Login rotates the session row; logout deletes it.
- **CSRF**: Double-submit token (`phronesis_csrf` cookie + `X-CSRF-Token` header) verified with `crypto.timingSafeEqual` on all `POST`, `PUT`, `PATCH`, and `DELETE` routes.

## Roles Matrix
| Capability | Student | Instructor | Admin |
| :--- | :---: | :---: | :---: |
| Browse published catalog | Yes | Yes | Yes |
| Enroll, learn, complete lessons | Yes | — | — |
| Submit assignments & take quizzes | Yes | — | — |
| Create/edit/reorder own courses & assessments | — | Yes | Yes |
| Grade submissions for own courses | — | Yes | — |
| Approve/reject pending courses | — | — | Yes |
| Manage users, roles & platform analytics | — | — | Yes |

## Course Lifecycle
```text
DRAFT ──(owner submits)──▶ PENDING ──(admin approves)──▶ PUBLISHED ──(owner/admin)──▶ ARCHIVED
                             │                                                          ▲
                             └──(admin rejects + reason)──▶ REJECTED ──(owner edits)────┴──▶ DRAFT
```
Invalid transitions return `409 Conflict`. Cross-owner mutations return `404 Not Found` to avoid leaking resource existence. Archived courses remain readable to already-enrolled students.

## Assignment Workflow
1. Only enrolled students (`ACTIVE` or `COMPLETED`) may submit to published assignments.
2. Submissions after `dueDate` are rejected with `409` unless `allowLateSubmission` is true, in which case `isLate` is recorded as `true`.
3. Resubmissions are rejected unless `allowResubmission` is true and `existingCount < 1 + maxResubmissions`.
4. Only the owning course instructor may grade a submission (`0 <= score <= maxScore`).

## Quiz Grading
- `isCorrect` is stripped from all student-facing quiz and in-progress attempt responses.
- Starting an attempt checks enrollment, published status, `attempts < maxAttempts`, and ensures at most one `IN_PROGRESS` attempt per student per quiz. `expiresAt = startedAt + timeLimitMinutes` using server time.
- A **30-second grace period** is allowed after `expiresAt` for in-flight network submissions. Submissions arriving after `expiresAt + 30s` are marked `EXPIRED` and graded strictly using answers previously saved via `PUT /attempts/:id/answers`.
- Submitted/expired attempts are immutable (`409` on re-submit). Grading computes `score`, `scoreMax`, and `passed = score >= passingScore` server-side.

## Progress Calculation
- Progress is never accepted from clients.
- `percentage = round((completedPublishedLessons / totalPublishedLessons) * 100)` computed from PostgreSQL at request time.
- Lesson completion (`POST /lessons/:lessonId/complete`) is idempotent via `LessonProgress` upsert and automatically transitions the `Enrollment` status to `COMPLETED` at `100%`.

## Setup

### 1. Environment Variables
Copy the example files (pre-configured for local Docker development):
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Start PostgreSQL (Docker Compose)
```bash
docker compose up -d db --wait
```
This starts PostgreSQL 16 on port `5436` (configurable via `POSTGRES_PORT`) and initializes both `phronesis` and `phronesis_test`.

### 3. Install Dependencies, Migrate, and Seed
```bash
npm install
cd backend
npx prisma migrate deploy
npx prisma db seed
DATABASE_URL="postgresql://phronesis:phronesis_dev_password@localhost:5436/phronesis_test?schema=public" npx prisma migrate deploy
cd ..
```

### Seeded Accounts
All seeded accounts share the password **`Phronesis123!`**:
- **Admin**: `admin@phronesis.edu`
- **Instructors**: `marcus.chen@phronesis.edu`, `sofia.patel@phronesis.edu`, `liam.oconnor@phronesis.edu`
- **Students**: `student1@phronesis.edu` through `student20@phronesis.edu`

### 4. Run Locally (Development)
- Backend (`http://localhost:4000`):
  ```bash
  npm run dev:backend
  ```
- Frontend (`http://localhost:3000`):
  ```bash
  npm run dev:frontend
  ```

## Testing
- **Typecheck & Lint**:
  ```bash
  npm run typecheck && npm run lint
  ```
- **Backend Integration Tests (Vitest + Supertest)**:
  Requires `DATABASE_URL_TEST` pointing to a database whose name ends in `_test` (guarded by `backend/tests/helpers/db.ts`).
  ```bash
  npm test
  ```
- **End-to-End Browser Journey (Playwright)**:
  Starts isolated backend (`4310`) and frontend (`3310`) servers and executes register → browse → enroll → complete lesson → submit assignment → take quiz → instructor grade → student verify grade & progress.
  ```bash
  npm run test:e2e
  ```

## Production Build
```bash
npm run build
```
To run production builds:
```bash
npm --workspace=backend run start
npm --workspace=frontend run start
```

## Deployment Notes
- Set `NODE_ENV=production`, a strong `SESSION_SECRET`, and the production `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL`.
- Terminate TLS at your reverse proxy (Nginx, Caddy, ALB) so `Secure` session and CSRF cookies transmit properly.
- For multi-instance deployments, swap `LocalDiskStorage` in `backend/src/modules/files/files.service.ts` with `S3StorageStub` (`backend/src/storage/s3.storage.ts`) wired to `@aws-sdk/client-s3`.

## Decisions
1. **Docker Postgres Port `5436`**: Defaulted `POSTGRES_PORT` to `5436` in `docker-compose.yml` and `.env.example` files so it does not conflict with existing local Postgres services on `5432`–`5435`.
2. **Double-Submit CSRF Token Delivery**: `/auth/csrf`, `/auth/login`, `/auth/register`, and `/auth/me` set the `phronesis_csrf` cookie AND return `csrfToken` in JSON so cross-port frontend origins (`localhost:3000` -> `localhost:4000`) can always send `X-CSRF-Token` without needing cross-origin `document.cookie` access.
3. **Quiz Expiry Grace Period**: Added a 30-second server grace window after `expiresAt`; submissions after `expiresAt + 30s` transition the attempt to `EXPIRED` and grade only previously saved answers.
4. **`StoredFile` Backing Model**: Added a `StoredFile` metadata table referenced by `CourseMaterial` and `Submission` so `POST /files` and `GET /files/:id` enforce uniform magic-byte checks, non-guessable UUID keys, and strict per-relationship access control without exposing filesystem paths.
5. **Vitest Single-Fork Pool**: Configured `singleFork: true` in `backend/vitest.config.ts` to guarantee deterministic sequential execution against `phronesis_test`.

## Known Limitations
- `S3StorageStub` is a documented interface stub; production object storage requires installing `@aws-sdk/client-s3` and supplying AWS/R2 credentials.
- Email notifications (e.g., course approval or grade published alerts) are not integrated because no external SMTP provider is configured.
- Video lessons use embeddable URLs (e.g., YouTube/Vimeo embeds) rather than self-hosted adaptive HLS video transcoding.
