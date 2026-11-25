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

async function ensurePlaylistCourses() {
  const marcus = await prisma.user.findUnique({ where: { email: "marcus.chen@phronesis.edu" } });
  const sofia = await prisma.user.findUnique({ where: { email: "sofia.patel@phronesis.edu" } });
  if (!marcus || !sofia) {
    return;
  }

  const playlistCourses = [
    {
      title: "Operating Systems",
      slug: "operating-systems-gate-smashers",
      description:
        "Complete Operating Systems curriculum covering process management, CPU scheduling, synchronization, deadlocks, memory management, paging, and file systems — featuring GATE Smashers' complete video playlist.",
      category: "Computer Science",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      instructorId: marcus.id,
      playlistUrl:
        "https://youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p&si=koL8hitaQ8K75b-V",
      embedUrl:
        "https://www.youtube.com/embed/videoseries?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p",
      modules: [
        {
          title: "Module 1: Processes, Threads & CPU Scheduling",
          lessons: [
            {
              title: "GATE Smashers OS Full Playlist & Process Lifecycle",
              content:
                "Watch the full GATE Smashers Operating Systems playlist embedded above.\n\nTopics covered in this module: OS goals, system calls, PCB, process states (New, Ready, Running, Waiting, Terminated), context switching, FCFS, SJF, SRTF, and Round Robin scheduling.",
              useVideo: true,
              durationMinutes: 45
            },
            {
              title: "Process Synchronization & Semaphores",
              content:
                "Critical section problem, Peterson's solution, mutex locks, counting/binary semaphores, producer-consumer, readers-writers, and dining philosophers.",
              useVideo: false,
              durationMinutes: 30
            }
          ]
        },
        {
          title: "Module 2: Deadlocks, Memory Management & Virtual Memory",
          lessons: [
            {
              title: "Deadlocks & Banker's Algorithm",
              content:
                "Necessary conditions (Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait), resource allocation graphs, deadlock avoidance via Banker's Algorithm, and recovery strategies.",
              useVideo: false,
              durationMinutes: 35
            },
            {
              title: "Paging, Segmentation & Page Replacement",
              content:
                "Logical vs physical address translation, page tables, TLB hit/miss effective access time, thrashing, FIFO, Optimal, and LRU page replacement algorithms.",
              useVideo: false,
              durationMinutes: 40
            }
          ]
        }
      ],
      assignmentTitle: "CPU Scheduling & Banker's Algorithm Problem Set",
      assignmentDesc:
        "Analyze Gantt charts for Round Robin (q=2) vs SRTF on a 5-process workload and verify safe sequence execution using Banker's Algorithm.",
      quizTitle: "Operating Systems Core Mastery Quiz",
      quizQuestion: {
        prompt: "Which condition is NOT one of the four Coffman conditions for deadlock?",
        options: [
          { text: "Mutual Exclusion", isCorrect: false },
          { text: "Preemptive Scheduling", isCorrect: true },
          { text: "Circular Wait", isCorrect: false }
        ]
      }
    },
    {
      title: "Backend Principles",
      slug: "backend-principles",
      description:
        "Master core backend engineering principles: networking protocols, REST & API design, databases, caching, message queues, scaling, and reliability patterns with full video playlist.",
      category: "Backend Engineering",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      instructorId: marcus.id,
      playlistUrl:
        "https://youtube.com/playlist?list=PLui3EUkuMTPgZcV0QhQrOcwMPcBCcd_Q1&si=L30za1rjxDbJMrY2",
      embedUrl:
        "https://www.youtube.com/embed/videoseries?list=PLui3EUkuMTPgZcV0QhQrOcwMPcBCcd_Q1",
      modules: [
        {
          title: "Module 1: Networking, Protocols & API Foundations",
          lessons: [
            {
              title: "Backend Principles Video Series & HTTP/TCP Internals",
              content:
                "Watch the full Backend Principles playlist embedded above.\n\nTopics covered: TCP three-way handshake, HTTP/1.1 vs HTTP/2 vs HTTP/3, TLS termination, reverse proxies, and stateless vs stateful services.",
              useVideo: true,
              durationMinutes: 40
            },
            {
              title: "Idempotency, Rate Limiting & Error Handling",
              content:
                "Designing idempotent POST/PUT endpoints, token bucket and sliding window rate limiters, structured error envelopes, and graceful shutdown.",
              useVideo: false,
              durationMinutes: 30
            }
          ]
        },
        {
          title: "Module 2: Storage, Caching & Asynchronous Processing",
          lessons: [
            {
              title: "Database Transactions, Indexing & Connection Pooling",
              content:
                "ACID isolation levels, B-Tree vs Hash indexes, N+1 query elimination, and connection pool sizing under concurrency.",
              useVideo: false,
              durationMinutes: 35
            },
            {
              title: "Caching Strategies & Message Queues",
              content:
                "Cache-aside vs write-through, cache invalidation pitfalls, pub/sub vs task queues, and dead-letter queues.",
              useVideo: false,
              durationMinutes: 30
            }
          ]
        }
      ],
      assignmentTitle: "Design an Idempotent Payment & Webhook API",
      assignmentDesc:
        "Document the database schema, idempotency-key middleware, retry backoff, and rate-limiting strategy for a high-reliability backend endpoint.",
      quizTitle: "Backend Principles Assessment",
      quizQuestion: {
        prompt: "Which caching pattern checks the cache first and falls back to the database on a miss?",
        options: [
          { text: "Cache-Aside (Lazy Loading)", isCorrect: true },
          { text: "Write-Behind Only", isCorrect: false },
          { text: "Round-Robin DNS", isCorrect: false }
        ]
      }
    },
    {
      title: "Data Structures & Algorithms (DSA)",
      slug: "data-structures-algorithms-dsa",
      description:
        "Structured Data Structures and Algorithms course covering recursion, arrays, linked lists, trees, graphs, dynamic programming, and greedy algorithms with full video playlist.",
      category: "Computer Science",
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      instructorId: sofia.id,
      playlistUrl:
        "https://youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz&si=gao1Bj67UIPUDdRl",
      embedUrl:
        "https://www.youtube.com/embed/videoseries?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz",
      modules: [
        {
          title: "Module 1: Complexity, Arrays, Recursion & Trees",
          lessons: [
            {
              title: "Complete DSA Playlist & Asymptotic Analysis",
              content:
                "Follow the complete Striver A2Z DSA video playlist embedded above.\n\nTopics covered: Big-O, Omega, Theta bounds, recursion trees, sliding window, two pointers, binary search on answers, and binary trees.",
              useVideo: true,
              durationMinutes: 50
            },
            {
              title: "Stacks, Queues, Heaps & Tries",
              content:
                "Monotonic stack patterns, priority queues, min/max heapify complexity, and prefix-tree insertion and search.",
              useVideo: false,
              durationMinutes: 35
            }
          ]
        },
        {
          title: "Module 2: Graphs & Dynamic Programming",
          lessons: [
            {
              title: "BFS, DFS, Topological Sort & Shortest Paths",
              content:
                "Cycle detection in directed/undirected graphs, Kahn's algorithm, Dijkstra's algorithm, Bellman-Ford, and Disjoint Set Union (DSU).",
              useVideo: false,
              durationMinutes: 45
            },
            {
              title: "Memoization & Tabulation in Dynamic Programming",
              content:
                "1D/2D DP state transitions, 0/1 Knapsack, Longest Common Subsequence, and space optimization.",
              useVideo: false,
              durationMinutes: 45
            }
          ]
        }
      ],
      assignmentTitle: "Graph Shortest Path & DP Optimization Report",
      assignmentDesc:
        "Implement Dijkstra's algorithm with a min-heap and convert a top-down memoized DP solution into a space-optimized bottom-up solution.",
      quizTitle: "DSA Foundations Quiz",
      quizQuestion: {
        prompt: "What is the worst-case time complexity of Binary Search on a sorted array of size n?",
        options: [
          { text: "O(n)", isCorrect: false },
          { text: "O(log n)", isCorrect: true },
          { text: "O(n log n)", isCorrect: false }
        ]
      }
    }
  ];

  for (const spec of playlistCourses) {
    const existing = await prisma.course.findUnique({ where: { slug: spec.slug } });
    if (existing) {
      continue;
    }

    const course = await prisma.course.create({
      data: {
        title: spec.title,
        slug: spec.slug,
        description: spec.description,
        category: spec.category,
        difficultyLevel: spec.difficultyLevel,
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        instructorId: spec.instructorId
      }
    });

    for (let mIdx = 0; mIdx < spec.modules.length; mIdx++) {
      const mSpec = spec.modules[mIdx]!;
      const mod = await prisma.module.create({
        data: {
          courseId: course.id,
          title: mSpec.title,
          description: `${spec.title} — ${mSpec.title}`,
          position: mIdx + 1
        }
      });

      for (let lIdx = 0; lIdx < mSpec.lessons.length; lIdx++) {
        const lSpec = mSpec.lessons[lIdx]!;
        await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: lSpec.title,
            content: lSpec.useVideo
              ? `${lSpec.content}\n\nPlaylist URL: ${spec.playlistUrl}`
              : lSpec.content,
            videoUrl: lSpec.useVideo ? spec.embedUrl : null,
            durationMinutes: lSpec.durationMinutes,
            position: lIdx + 1,
            isPublished: true
          }
        });
      }
    }

    await prisma.assignment.create({
      data: {
        courseId: course.id,
        title: spec.assignmentTitle,
        description: spec.assignmentDesc,
        dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        maxScore: 100,
        allowResubmission: true,
        maxResubmissions: 2,
        allowLateSubmission: true,
        isPublished: true
      }
    });

    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: spec.quizTitle,
        description: `Verify your core understanding of ${spec.title}.`,
        timeLimitMinutes: 20,
        passingScore: 1,
        maxAttempts: 3,
        isPublished: true
      }
    });

    await prisma.question.create({
      data: {
        quizId: quiz.id,
        prompt: spec.quizQuestion.prompt,
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        position: 1,
        options: {
          create: spec.quizQuestion.options.map((o, idx) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            position: idx + 1
          }))
        }
      }
    });
  }
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@phronesis.edu" }
  });
  if (existingAdmin) {
    await ensurePlaylistCourses();
    console.log("Database already seeded. Ensured playlist courses are present.");
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

  await ensurePlaylistCourses();
  console.log(`Seed complete: 1 admin (${admin.email}), ${instructors.length} instructors, ${students.length} students, ${courses.length} + playlist courses.`);
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
