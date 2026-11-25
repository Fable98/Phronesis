import {
  CourseStatus,
  DifficultyLevel,
  EnrollmentStatus,
  PrismaClient,
  QuestionType,
  QuizAttemptStatus,
  Role,
  SubmissionStatus
} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@phronesis.edu" }
  });
  if (existingAdmin) {
    console.log("Database already seeded. Skipping duplicate seed.");
    return;
  }

  const defaultPassHash = await hashPassword("Phronesis123!");

  // 1 Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@phronesis.edu",
      name: "Dr. Elena Vance",
      passwordHash: defaultPassHash,
      role: Role.ADMIN,
      bio: "Platform Administrator at Phronesis Academy."
    }
  });

  // 3 Instructors
  const instructorDefs = [
    {
      email: "marcus.chen@phronesis.edu",
      name: "Prof. Marcus Chen",
      bio: "Distributed Systems & Backend Architecture Instructor."
    },
    {
      email: "sofia.patel@phronesis.edu",
      name: "Dr. Sofia Patel",
      bio: "Machine Learning, Statistics, and Data Engineering Instructor."
    },
    {
      email: "liam.oconnor@phronesis.edu",
      name: "Liam O'Connor",
      bio: "Frontend Engineering, Accessibility, and Design Systems Lead."
    }
  ];

  const instructors = await Promise.all(
    instructorDefs.map((inst) =>
      prisma.user.create({
        data: {
          email: inst.email,
          name: inst.name,
          passwordHash: defaultPassHash,
          role: Role.INSTRUCTOR,
          bio: inst.bio
        }
      })
    )
  );

  // 20 Students
  const students = await Promise.all(
    Array.from({ length: 20 }, (_, idx) => {
      const num = idx + 1;
      return prisma.user.create({
        data: {
          email: `student${num}@phronesis.edu`,
          name: `Student ${num.toString().padStart(2, "0")}`,
          passwordHash: defaultPassHash,
          role: Role.STUDENT,
          bio: `Phronesis learner #${num}`
        }
      });
    })
  );

  // 8 Courses across all statuses (4 PUBLISHED, 1 PENDING, 1 DRAFT, 1 REJECTED, 1 ARCHIVED)
  const courseSpecs = [
    {
      title: "TypeScript & Node.js Backend Architecture",
      slug: "typescript-nodejs-backend-architecture",
      description:
        "Master clean layered architectures, PostgreSQL data modeling, authentication security, and production APIs with TypeScript and Express.",
      category: "Backend Engineering",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date("2026-09-15T10:00:00Z"),
      instructorId: instructors[0]!.id
    },
    {
      title: "Applied Machine Learning Foundations",
      slug: "applied-machine-learning-foundations",
      description:
        "Build supervised and unsupervised models from first principles, understand bias-variance tradeoffs, and evaluate real datasets.",
      category: "Data Science",
      difficultyLevel: DifficultyLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date("2026-09-20T10:00:00Z"),
      instructorId: instructors[1]!.id
    },
    {
      title: "Modern React, Next.js & Accessible UI",
      slug: "modern-react-nextjs-accessible-ui",
      description:
        "Design responsive, WCAG-compliant applications using React App Router, TanStack Query, React Hook Form, and Tailwind CSS.",
      category: "Frontend Engineering",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date("2026-10-01T10:00:00Z"),
      instructorId: instructors[2]!.id
    },
    {
      title: "PostgreSQL Performance & Query Tuning",
      slug: "postgresql-performance-query-tuning",
      description:
        "Deep dive into B-Tree indexes, query execution plans, transactions, locking, and schema optimization for high-throughput apps.",
      category: "Databases",
      difficultyLevel: DifficultyLevel.ADVANCED,
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date("2026-10-10T10:00:00Z"),
      instructorId: instructors[0]!.id
    },
    {
      title: "Deep Learning for NLP Systems",
      slug: "deep-learning-for-nlp-systems",
      description:
        "Transformers, tokenization, attention mechanisms, and evaluation pipelines for modern language applications.",
      category: "Data Science",
      difficultyLevel: DifficultyLevel.ADVANCED,
      status: CourseStatus.PENDING,
      publishedAt: null,
      instructorId: instructors[1]!.id
    },
    {
      title: "Design Systems with Tailwind CSS",
      slug: "design-systems-with-tailwind-css",
      description:
        "Create reusable component primitives, design tokens, and dark-mode friendly interfaces at scale.",
      category: "Frontend Engineering",
      difficultyLevel: DifficultyLevel.BEGINNER,
      status: CourseStatus.DRAFT,
      publishedAt: null,
      instructorId: instructors[2]!.id
    },
    {
      title: "Rapid Cloud Microservices (Needs Revision)",
      slug: "rapid-cloud-microservices",
      description:
        "Introduction to event-driven services, queues, and observability patterns in distributed cloud environments.",
      category: "Backend Engineering",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      status: CourseStatus.REJECTED,
      rejectionReason: "Please include at least two practical modules and an assessment quiz before publishing.",
      publishedAt: null,
      instructorId: instructors[0]!.id
    },
    {
      title: "Legacy Web Security Essentials",
      slug: "legacy-web-security-essentials",
      description:
        "Historical web vulnerabilities, OWASP Top 10 fundamentals, and defensive coding checklists for web teams.",
      category: "Security",
      difficultyLevel: DifficultyLevel.BEGINNER,
      status: CourseStatus.ARCHIVED,
      publishedAt: new Date("2026-06-01T10:00:00Z"),
      instructorId: instructors[2]!.id
    }
  ];

  const courses = [];
  for (const spec of courseSpecs) {
    const course = await prisma.course.create({ data: spec });
    courses.push(course);
  }

  // Create modules and lessons for every course
  const courseLessonMap = new Map<string, string[]>();

  for (const course of courses) {
    const lessonIds: string[] = [];
    for (let m = 1; m <= 2; m++) {
      const mod = await prisma.module.create({
        data: {
          courseId: course.id,
          title: `Module ${m}: ${m === 1 ? "Core Foundations" : "Applied Practice"}`,
          description: `Structured lessons for ${course.title} — part ${m}.`,
          position: m
        }
      });

      for (let l = 1; l <= 3; l++) {
        const lesson = await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: `Lesson ${m}.${l}: ${
              m === 1 ? ["Overview", "Key Concepts", "Mental Models"][l - 1] : ["Hands-on Lab", "Patterns", "Review"][l - 1]
            }`,
            content: `Welcome to **${course.title}** (${mod.title}).\n\nIn this lesson you will explore practical techniques, architectural trade-offs, and exercises designed to solidify your understanding.`,
            videoUrl: l === 1 ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : null,
            durationMinutes: 10 + l * 5,
            position: l,
            isPublished: !(course.status === CourseStatus.PUBLISHED && m === 2 && l === 3 && course.slug === "postgresql-performance-query-tuning")
          }
        });
        if (lesson.isPublished) {
          lessonIds.push(lesson.id);
        }
      }
    }
    courseLessonMap.set(course.id, lessonIds);
  }

  // Enrollments with varied progress across the 4 published courses + 1 archived course
  const publishedCourses = courses.filter((c) => c.status === CourseStatus.PUBLISHED);
  const archivedCourse = courses.find((c) => c.status === CourseStatus.ARCHIVED)!;

  const enrollmentRecords = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i]!;
    const primaryCourse = publishedCourses[i % publishedCourses.length]!;
    const secondaryCourse = publishedCourses[(i + 1) % publishedCourses.length]!;

    const primaryLessons = courseLessonMap.get(primaryCourse.id) ?? [];
    const completeAll = i % 4 === 0;
    const completedCount = completeAll ? primaryLessons.length : (i % 3) + 1;

    const e1 = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: primaryCourse.id,
        status: completeAll ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE,
        completedAt: completeAll ? new Date() : null,
        lastAccessedAt: new Date(Date.now() - i * 3600 * 1000)
      }
    });
    enrollmentRecords.push({ enrollment: e1, course: primaryCourse, student });

    for (let k = 0; k < Math.min(completedCount, primaryLessons.length); k++) {
      await prisma.lessonProgress.create({
        data: {
          studentId: student.id,
          lessonId: primaryLessons[k]!
        }
      });
    }

    if (i < 10) {
      const e2 = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: secondaryCourse.id,
          status: EnrollmentStatus.ACTIVE,
          lastAccessedAt: new Date(Date.now() - (i + 5) * 3600 * 1000)
        }
      });
      enrollmentRecords.push({ enrollment: e2, course: secondaryCourse, student });
    }
  }

  // Enroll student1 in archivedCourse to verify archived courses remain readable to enrolled students
  await prisma.enrollment.create({
    data: {
      studentId: students[0]!.id,
      courseId: archivedCourse.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  // Assignments & Submissions (graded and ungraded)
  for (const course of publishedCourses) {
    const assignment = await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: `${course.title} — Capstone Exercise`,
        description: "Submit a concise architecture write-up or implementation summary addressing all core rubric items.",
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        maxScore: 100,
        allowResubmission: true,
        maxResubmissions: 2,
        allowLateSubmission: true,
        isPublished: true
      }
    });

    const courseEnrollments = enrollmentRecords.filter((r) => r.course.id === course.id);
    for (let idx = 0; idx < courseEnrollments.length; idx++) {
      const { student } = courseEnrollments[idx]!;
      const isGraded = idx % 2 === 0;
      await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          content: `Submission from ${student.name} for ${course.title}. Covered modular design, validation, and testing.`,
          attemptNumber: 1,
          isLate: false,
          status: isGraded ? SubmissionStatus.GRADED : SubmissionStatus.SUBMITTED,
          score: isGraded ? 82 + (idx % 15) : null,
          feedback: isGraded ? "Well structured and clear reasoning." : null,
          gradedById: isGraded ? course.instructorId : null,
          gradedAt: isGraded ? new Date() : null
        }
      });
    }
  }

  // Quizzes, Questions, Options & QuizAttempts
  for (const course of publishedCourses) {
    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: `${course.title} Mastery Check`,
        description: "Assess your understanding of core course concepts.",
        timeLimitMinutes: 20,
        passingScore: 2,
        maxAttempts: 3,
        isPublished: true
      }
    });

    const q1 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: `Which practice best strengthens reliability in ${course.title}?`,
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        position: 1,
        options: {
          create: [
            { text: "Explicit validation and deterministic state transitions", isCorrect: true, position: 1 },
            { text: "Skipping error handling in production", isCorrect: false, position: 2 },
            { text: "Storing secrets directly in source code", isCorrect: false, position: 3 }
          ]
        }
      },
      include: { options: true }
    });

    const q2 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: "Automated integration tests should run against an isolated test database.",
        type: QuestionType.TRUE_FALSE,
        points: 1,
        position: 2,
        options: {
          create: [
            { text: "True", isCorrect: true, position: 1 },
            { text: "False", isCorrect: false, position: 2 }
          ]
        }
      },
      include: { options: true }
    });

    const q3 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: "Where should authorization and ownership checks be enforced?",
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        position: 3,
        options: {
          create: [
            { text: "In the frontend UI only", isCorrect: false, position: 1 },
            { text: "On the backend service layer for every request", isCorrect: true, position: 2 },
            { text: "In browser localStorage", isCorrect: false, position: 3 }
          ]
        }
      },
      include: { options: true }
    });

    const courseEnrollments = enrollmentRecords.filter((r) => r.course.id === course.id);
    for (let idx = 0; idx < Math.min(3, courseEnrollments.length); idx++) {
      const { enrollment, student } = courseEnrollments[idx]!;
      const q1Opt = idx === 0 ? q1.options[0]! : q1.options[1]!;
      const q2Opt = q2.options[0]!;
      const q3Opt = q3.options[1]!;
      const score = (q1Opt.isCorrect ? 1 : 0) + (q2Opt.isCorrect ? 1 : 0) + (q3Opt.isCorrect ? 1 : 0);

      await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          enrollmentId: enrollment.id,
          status: QuizAttemptStatus.SUBMITTED,
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          submittedAt: new Date(),
          score,
          scoreMax: 3,
          passed: score >= quiz.passingScore,
          answers: {
            create: [
              {
                questionId: q1.id,
                selectedOptionId: q1Opt.id,
                isCorrect: q1Opt.isCorrect,
                pointsEarned: q1Opt.isCorrect ? 1 : 0
              },
              {
                questionId: q2.id,
                selectedOptionId: q2Opt.id,
                isCorrect: q2Opt.isCorrect,
                pointsEarned: q2Opt.isCorrect ? 1 : 0
              },
              {
                questionId: q3.id,
                selectedOptionId: q3Opt.id,
                isCorrect: q3Opt.isCorrect,
                pointsEarned: q3Opt.isCorrect ? 1 : 0
              }
            ]
          }
        }
      });
    }
  }

  console.log(`Seed complete: 1 admin (${admin.email}), ${instructors.length} instructors, ${students.length} students, ${courses.length} courses.`);
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
