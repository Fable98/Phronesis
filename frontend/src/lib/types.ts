export type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";
export type CourseStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
export type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "DROPPED";
export type SubmissionStatus = "SUBMITTED" | "GRADED";
export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";
export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StoredFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt?: string;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  fileId: string;
  title: string;
  file: StoredFileMeta;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  durationMinutes: number;
  position: number;
  isPublished: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficultyLevel: DifficultyLevel;
  thumbnailUrl: string | null;
  status: CourseStatus;
  rejectionReason: string | null;
  publishedAt: string | null;
  instructorId: string;
  createdAt: string;
  instructor?: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
  };
  modules?: Module[];
  materials?: CourseMaterial[];
  _count?: {
    modules?: number;
    enrollments?: number;
    assignments?: number;
    quizzes?: number;
  };
}

export interface CourseProgress {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completedLessonIds: string[];
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  lastAccessedAt: string;
  course?: Course;
  student?: { id: string; name: string; email: string };
  progress?: CourseProgress;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string | null;
  fileId: string | null;
  attemptNumber: number;
  isLate: boolean;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  submittedAt: string;
  file?: StoredFileMeta | null;
  student?: { id: string; name: string; email: string };
  assignment?: {
    id: string;
    title: string;
    maxScore: number;
    dueDate: string | null;
    course?: { id: string; title: string };
  };
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string | null;
  maxScore: number;
  allowResubmission: boolean;
  maxResubmissions: number;
  allowLateSubmission: boolean;
  isPublished: boolean;
  submissions?: Submission[];
  _count?: { submissions: number };
}

export interface QuizOption {
  id: string;
  text: string;
  position: number;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  quizId: string;
  prompt: string;
  type: QuestionType;
  points: number;
  position: number;
  options: QuizOption[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  enrollmentId: string;
  status: QuizAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  score: number | null;
  scoreMax: number;
  passed: boolean | null;
  quiz?: {
    id: string;
    title: string;
    passingScore: number;
    course?: { id: string; title: string };
  };
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  questions?: Question[];
  attempts?: QuizAttempt[];
  _count?: { questions: number; attempts: number };
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
    lastAccessedAt: string;
  }>;
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
