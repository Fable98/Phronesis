"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, GraduationCap, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ErrorState, LoadingState } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { PlatformAnalytics } from "@/lib/types";

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: async () => {
      const res = await apiRequest<PlatformAnalytics>("/analytics/platform");
      return res.data;
    }
  });

  if (isLoading) return <LoadingState message="Loading platform analytics..." />;
  if (isError || !data) {
    return (
      <ErrorState
        message={isError ? (error as Error).message : "Unable to load platform analytics"}
        onRetry={() => refetch()}
      />
    );
  }

  const { totals, coursesByStatus, topCourses, usersByRole } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
        <p className="text-sm text-slate-600">
          Real-time institution metrics across users, course approvals, enrollments, and assessments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Users</span>
            <Users className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalUsers}</p>
          <p className="mt-1 text-xs text-slate-500">
            {usersByRole.map((r) => `${r.count} ${r.role}`).join(" · ")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Total Courses</span>
            <BookOpen className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalCourses}</p>
          <p className="mt-1 text-xs text-slate-500">
            {coursesByStatus.find((s) => s.status === "PENDING")?.count ?? 0} pending review
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Enrollments</span>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalEnrollments}</p>
          <p className="mt-1 text-xs text-slate-500">
            {totals.completionRate}% completion rate ({totals.completedEnrollments} completed)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Assessments</span>
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totals.totalQuizAttempts}</p>
          <p className="mt-1 text-xs text-slate-500">
            quiz attempts · {totals.gradedSubmissions}/{totals.totalSubmissions} submissions graded
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Top Courses by Enrollment</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCourses.map((c) => ({
                  name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
                  enrollments: c.enrollments
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Courses by Lifecycle Status</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coursesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
