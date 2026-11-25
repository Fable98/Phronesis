export interface PlatformAnalytics {
  totals: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    totalSubmissions: number;
    gradedSubmissions: number;
    totalQuizAttempts: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  coursesByStatus: Array<{ status: string; count: number }>;
  coursesByCategory: Array<{ category: string; count: number }>;
  topCourses: Array<{ courseId: string; title: string; enrollments: number }>;
}

export interface InstructorAnalytics {
  totals: {
    totalCourses: number;
    publishedCourses: number;
    pendingCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    pendingGradingCount: number;
    averageQuizScorePercent: number;
  };
  courseStats: Array<{
    courseId: string;
    title: string;
    status: string;
    enrollments: number;
    completed: number;
    pendingSubmissions: number;
    quizAttempts: number;
  }>;
}

export interface StudentAnalytics {
  totals: {
    enrolledCourses: number;
    activeCourses: number;
    completedCourses: number;
    lessonsCompleted: number;
    averageProgress: number;
    gradedSubmissionsCount: number;
    quizAttemptsCount: number;
    quizzesPassedCount: number;
  };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    nextLessonId: string | null;
    progressPercent: number;
  } | null;
  courseProgress: Array<{
    courseId: string;
    title: string;
    category: string;
    enrollmentStatus: string;
    progressPercent: number;
    lastAccessedAt: Date;
  }>;
}
