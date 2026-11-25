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
          <h1 className="nb-heading text-3xl">Instructor Dashboard</h1>
          <p className="text-sm text-slate-700">
            Monitor course enrollments, pending grading queues, and quiz performance.
          </p>
        </div>
        <Link href="/instructor/courses/new" className="nb-btn-primary text-xs">
          <PlusCircle className="h-4 w-4" />
          New Course
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="nb-card-mustard p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">My Courses</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.totalCourses}</p>
          <p className="mt-1 text-xs font-medium text-[#111827]/80">
            {totals.publishedCourses} published · {totals.pendingCourses} pending
          </p>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Enrollments</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.totalEnrollments}
          </p>
          <p className="mt-1 text-xs text-slate-700">{totals.completedEnrollments} completed</p>
        </div>

        <div className="nb-card-lilac p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Pending Grading</span>
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.pendingGradingCount}
          </p>
          <Link
            href="/instructor/submissions"
            className="mt-1 inline-block font-mono text-xs font-bold text-[#111827] underline"
          >
            Review queue →
          </Link>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Avg Quiz Score</span>
            <GraduationCap className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.averageQuizScorePercent}%
          </p>
          <p className="mt-1 text-xs text-slate-700">Across all attempts</p>
        </div>
      </div>

      {courseStats.length === 0 ? (
        <EmptyState
          title="No courses created yet"
          description="Create your first course, add modules and lessons, and submit it for admin approval."
          action={
            <Link href="/instructor/courses/new" className="nb-btn-primary text-xs">
              Create Course
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="nb-card p-6">
            <h2 className="nb-heading text-base">Enrollments vs Completions by Course</h2>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseStats.map((c) => ({
                    name: c.title.length > 16 ? `${c.title.slice(0, 16)}…` : c.title,
                    Enrollments: c.enrollments,
                    Completed: c.completed
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#111827" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#111827" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Enrollments" fill="#111827" />
                  <Bar dataKey="Completed" fill="#A9D8B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nb-card p-6">
            <h2 className="nb-heading text-base">Course Breakdown</h2>
            <ul className="mt-4 space-y-3">
              {courseStats.map((c) => (
                <li
                  key={c.courseId}
                  className="flex items-center justify-between gap-3 border-2 border-[#111827] bg-[#F5F3EC] p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono font-bold text-[#111827]">{c.title}</p>
                      <StatusBadge value={c.status} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-700">
                      {c.enrollments} enrolled · {c.pendingSubmissions} ungraded · {c.quizAttempts}{" "}
                      quiz attempts
                    </p>
                  </div>
                  <Link
                    href={`/instructor/courses/${c.courseId}`}
                    className="nb-btn-secondary shrink-0 px-3 py-1.5 text-xs"
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
