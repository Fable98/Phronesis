"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, CheckCircle2, PlayCircle, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { StudentAnalytics } from "@/lib/types";

export default function StudentDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", "student"],
    queryFn: async () => {
      const res = await apiRequest<StudentAnalytics>("/analytics/student");
      return res.data;
    }
  });

  if (isLoading) return <LoadingState message="Loading your learning analytics..." />;
  if (isError || !data) {
    return (
      <ErrorState
        message={isError ? (error as Error).message : "Unable to load dashboard"}
        onRetry={() => refetch()}
      />
    );
  }

  const { totals, continueLearning, courseProgress } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="nb-heading text-3xl">Student Dashboard</h1>
          <p className="text-sm text-slate-700">
            Track your active enrollments, completed lessons, and assessment progress.
          </p>
        </div>

        {continueLearning && (
          <Link
            href={
              continueLearning.nextLessonId
                ? `/student/courses/${continueLearning.courseId}/learn?lessonId=${continueLearning.nextLessonId}`
                : `/student/courses/${continueLearning.courseId}/learn`
            }
            className="nb-btn-primary text-xs"
          >
            <PlayCircle className="h-4 w-4" />
            Continue Learning: {continueLearning.courseTitle}
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="nb-card-mustard p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Enrolled Courses</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.enrolledCourses}</p>
          <p className="mt-1 text-xs font-medium text-[#111827]/80">
            {totals.completedCourses} completed
          </p>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Lessons Done</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.lessonsCompleted}</p>
          <p className="mt-1 text-xs text-slate-700">Verified server progress</p>
        </div>

        <div className="nb-card-lilac p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Avg Progress</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.averageProgress}%</p>
          <p className="mt-1 text-xs font-medium text-[#111827]/80">
            {totals.activeCourses} active courses
          </p>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Assessments</span>
            <Award className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.quizzesPassedCount}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            quizzes passed · {totals.gradedSubmissionsCount} graded
          </p>
        </div>
      </div>

      {courseProgress.length === 0 ? (
        <EmptyState
          title="You are not enrolled in any courses yet"
          description="Browse the Phronesis catalog to enroll in a course and start learning."
          action={
            <Link href="/courses" className="nb-btn-primary text-xs">
              Explore Course Catalog
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="nb-card p-6">
            <h2 className="nb-heading text-base">Course Completion Progress (%)</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseProgress.map((c) => ({
                    name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
                    progress: c.progressPercent
                  }))}
                  margin={{ top: 10, right: 12, left: -16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#111827" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#111827" }} />
                  <Tooltip />
                  <Bar dataKey="progress" fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nb-card p-6">
            <h2 className="nb-heading text-base">Recent Courses</h2>
            <ul className="mt-4 space-y-3">
              {courseProgress.map((c) => (
                <li
                  key={c.courseId}
                  className="flex items-center justify-between gap-3 border-2 border-[#111827] bg-[#F5F3EC] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-sm font-bold text-[#111827]">{c.title}</p>
                      <StatusBadge value={c.enrollmentStatus} />
                    </div>
                    <div className="mt-2 h-2.5 w-full border border-[#111827] bg-white">
                      <div
                        className="h-full bg-[#A9D8B8]"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/student/courses/${c.courseId}/learn`}
                    className="nb-btn-secondary shrink-0 px-3 py-1.5 text-xs"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
