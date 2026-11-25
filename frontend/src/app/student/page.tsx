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
          <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
          <p className="text-sm text-slate-600">
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
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <PlayCircle className="h-4 w-4" />
            Continue Learning: {continueLearning.courseTitle}
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Enrolled Courses</span>
            <BookOpen className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.enrolledCourses}</p>
          <p className="mt-1 text-xs text-slate-500">{totals.completedCourses} completed</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Lessons Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.lessonsCompleted}</p>
          <p className="mt-1 text-xs text-slate-500">Verified server progress</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Average Progress</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.averageProgress}%</p>
          <p className="mt-1 text-xs text-slate-500">{totals.activeCourses} active courses</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Assessments</span>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.quizzesPassedCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            quizzes passed · {totals.gradedSubmissionsCount} graded assignments
          </p>
        </div>
      </div>

      {courseProgress.length === 0 ? (
        <EmptyState
          title="You are not enrolled in any courses yet"
          description="Browse the Phronesis catalog to enroll in a course and start learning."
          action={
            <Link
              href="/courses"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Explore Course Catalog
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Course Completion Progress (%)</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseProgress.map((c) => ({
                    name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
                    progress: c.progressPercent
                  }))}
                  margin={{ top: 10, right: 12, left: -16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="progress" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Recent Courses</h2>
            <ul className="mt-4 space-y-3">
              {courseProgress.map((c) => (
                <li
                  key={c.courseId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.title}</p>
                      <StatusBadge value={c.enrollmentStatus} />
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/student/courses/${c.courseId}/learn`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
