import { CourseStatus, EnrollmentStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { computeCourseProgress } from "../progress/progress.service";
import {
  InstructorAnalytics,
  PlatformAnalytics,
  StudentAnalytics
} from "./analytics.types";

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const [
    totalUsers,
    usersGrouped,
    totalCourses,
    coursesStatusGrouped,
    coursesCategoryGrouped,
    totalEnrollments,
    completedEnrollments,
    totalSubmissions,
    gradedSubmissions,
    totalQuizAttempts,
    topCoursesRaw
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.course.count(),
    prisma.course.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.course.groupBy({ by: ["category"], _count: { id: true } }),
    prisma.enrollment.count({ where: { status: { not: EnrollmentStatus.DROPPED } } }),
    prisma.enrollment.count({ where: { status: EnrollmentStatus.COMPLETED } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: SubmissionStatus.GRADED } }),
    prisma.quizAttempt.count(),
    prisma.course.findMany({
      take: 6,
      orderBy: { enrollments: { _count: "desc" } },
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } }
      }
    })
  ]);

  const completionRate =
    totalEnrollments === 0 ? 0 : Math.round((completedEnrollments / totalEnrollments) * 100);

  return {
    totals: {
      totalUsers,
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate,
      totalSubmissions,
      gradedSubmissions,
      totalQuizAttempts
    },
    usersByRole: usersGrouped.map((g) => ({ role: g.role, count: g._count.id })),
    coursesByStatus: coursesStatusGrouped.map((g) => ({ status: g.status, count: g._count.id })),
    coursesByCategory: coursesCategoryGrouped.map((g) => ({
      category: g.category,
      count: g._count.id
    })),
    topCourses: topCoursesRaw.map((c) => ({
      courseId: c.id,
      title: c.title,
      enrollments: c._count.enrollments
    }))
  };
}

export async function getInstructorAnalytics(instructorId: string): Promise<InstructorAnalytics> {
  const courses = await prisma.course.findMany({
    where: { instructorId },
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        where: { status: { not: EnrollmentStatus.DROPPED } },
        select: { status: true }
      },
      assignments: {
        select: {
          submissions: {
            select: { status: true }
          }
        }
      },
      quizzes: {
        select: {
          attempts: {
            select: { score: true, scoreMax: true }
          }
        }
      }
    }
  });

  let publishedCourses = 0;
  let pendingCourses = 0;
  let totalEnrollments = 0;
  let completedEnrollments = 0;
  let pendingGradingCount = 0;
  let totalScoreSum = 0;
  let totalScoreMaxSum = 0;

  const courseStats = courses.map((course) => {
    if (course.status === CourseStatus.PUBLISHED) publishedCourses += 1;
    if (course.status === CourseStatus.PENDING) pendingCourses += 1;

    const enrollments = course.enrollments.length;
    const completed = course.enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
    totalEnrollments += enrollments;
    completedEnrollments += completed;

    let pendingSubmissions = 0;
    for (const a of course.assignments) {
      for (const s of a.submissions) {
        if (s.status === SubmissionStatus.SUBMITTED) {
          pendingSubmissions += 1;
        }
      }
    }
    pendingGradingCount += pendingSubmissions;

    let quizAttempts = 0;
    for (const q of course.quizzes) {
      for (const att of q.attempts) {
        quizAttempts += 1;
        if (att.score !== null && att.scoreMax > 0) {
          totalScoreSum += att.score;
          totalScoreMaxSum += att.scoreMax;
        }
      }
    }

    return {
      courseId: course.id,
      title: course.title,
      status: course.status,
      enrollments,
      completed,
      pendingSubmissions,
      quizAttempts
    };
  });

  const averageQuizScorePercent =
    totalScoreMaxSum === 0 ? 0 : Math.round((totalScoreSum / totalScoreMaxSum) * 100);

  return {
    totals: {
      totalCourses: courses.length,
      publishedCourses,
      pendingCourses,
      totalEnrollments,
      completedEnrollments,
      pendingGradingCount,
      averageQuizScorePercent
    },
    courseStats
  };
}

export async function getStudentAnalytics(studentId: string): Promise<StudentAnalytics> {
  const [enrollments, lessonsCompleted, gradedSubmissionsCount, quizAttempts] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        studentId,
        status: { not: EnrollmentStatus.DROPPED }
      },
      orderBy: { lastAccessedAt: "desc" },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { position: "asc" },
              include: {
                lessons: {
                  where: { isPublished: true },
                  orderBy: { position: "asc" },
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    }),
    prisma.lessonProgress.count({ where: { studentId } }),
    prisma.submission.count({ where: { studentId, status: SubmissionStatus.GRADED } }),
    prisma.quizAttempt.findMany({
      where: { studentId },
      select: { passed: true }
    })
  ]);

  const courseProgress = await Promise.all(
    enrollments.map(async (e) => {
      const p = await computeCourseProgress(studentId, e.courseId);
      return {
        courseId: e.courseId,
        title: e.course.title,
        category: e.course.category,
        enrollmentStatus: e.status,
        progressPercent: p.percentage,
        lastAccessedAt: e.lastAccessedAt,
        completedLessonIds: p.completedLessonIds,
        modules: e.course.modules
      };
    })
  );

  const activeCourses = enrollments.filter((e) => e.status === EnrollmentStatus.ACTIVE).length;
  const completedCourses = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length;
  const averageProgress =
    courseProgress.length === 0
      ? 0
      : Math.round(
          courseProgress.reduce((sum, c) => sum + c.progressPercent, 0) / courseProgress.length
        );

  let continueLearning: StudentAnalytics["continueLearning"] = null;
  const candidate =
    courseProgress.find((c) => c.enrollmentStatus === EnrollmentStatus.ACTIVE) ?? courseProgress[0];
  if (candidate) {
    const completedSet = new Set(candidate.completedLessonIds);
    const orderedLessons = candidate.modules.flatMap((m) => m.lessons);
    const nextLesson =
      orderedLessons.find((l) => !completedSet.has(l.id)) ?? orderedLessons[0] ?? null;
    continueLearning = {
      courseId: candidate.courseId,
      courseTitle: candidate.title,
      nextLessonId: nextLesson?.id ?? null,
      progressPercent: candidate.progressPercent
    };
  }

  return {
    totals: {
      enrolledCourses: enrollments.length,
      activeCourses,
      completedCourses,
      lessonsCompleted,
      averageProgress,
      gradedSubmissionsCount,
      quizAttemptsCount: quizAttempts.length,
      quizzesPassedCount: quizAttempts.filter((q) => q.passed === true).length
    },
    continueLearning,
    courseProgress: courseProgress.map((c) => ({
      courseId: c.courseId,
      title: c.title,
      category: c.category,
      enrollmentStatus: c.enrollmentStatus,
      progressPercent: c.progressPercent,
      lastAccessedAt: c.lastAccessedAt
    }))
  };
}
