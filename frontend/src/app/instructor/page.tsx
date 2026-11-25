"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardList, GraduationCap, PlusCircle, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { InstructorAnalytics } from "@/lib/types";

export default function InstructorDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", "instructor"],
    queryFn: async () => {
      const res = await apiRequest<InstructorAnalytics>("/analytics/instructor");
      return res.data;
    }
  });

  if (isLoading) return <LoadingState message="Loading instructor analytics..." />;
  if (isError || !data) {
    return (
      <ErrorState
        message={isError ? (error as Error).message : "Unable to load analytics"}
        onRetry={() => refetch()}
      />
    );
  }

  const { totals, courseStats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instructor Dashboard</h1>
          <p className="text-sm text-slate-600">
            Monitor course enrollments, pending grading queues, and quiz performance.
          </p>
        </div>
        <Link
          href="/instructor/courses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Course
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">My Courses</span>
            <BookOpen className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalCourses}</p>
          <p className="mt-1 text-xs text-slate-500">
            {totals.publishedCourses} published · {totals.pendingCourses} pending
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Enrollments</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalEnrollments}</p>
          <p className="mt-1 text-xs text-slate-500">{totals.completedEnrollments} completed</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Pending Grading</span>
            <ClipboardList className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.pendingGradingCount}</p>
          <Link href="/instructor/submissions" className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:underline">
            Review queue →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Avg Quiz Score</span>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.averageQuizScorePercent}%</p>
          <p className="mt-1 text-xs text-slate-500">Across all attempts</p>
        </div>
      </div>

      {courseStats.length === 0 ? (
        <EmptyState
          title="No courses created yet"
          description="Create your first course, add modules and lessons, and submit it for admin approval."
          action={
            <Link
              href="/instructor/courses/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Create Course
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Enrollments vs Completions by Course</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseStats.map((c) => ({
                    name: c.title.length > 16 ? `${c.title.slice(0, 16)}…` : c.title,
                    Enrollments: c.enrollments,
                    Completed: c.completed
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Enrollments" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Course Breakdown</h2>
            <ul className="mt-4 space-y-3">
              {courseStats.map((c) => (
                <li
                  key={c.courseId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{c.title}</p>
                      <StatusBadge value={c.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.enrollments} enrolled · {c.pendingSubmissions} ungraded · {c.quizAttempts} quiz attempts
                    </p>
                  </div>
                  <Link
                    href={`/instructor/courses/${c.courseId}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
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
