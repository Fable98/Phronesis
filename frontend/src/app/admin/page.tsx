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
        <h1 className="nb-heading text-3xl">Platform Analytics</h1>
        <p className="text-sm text-slate-700">
          Real-time institution metrics across users, course approvals, enrollments, and assessments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="nb-card-mustard p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Total Users</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.totalUsers}</p>
          <p className="mt-1 font-mono text-[11px] font-bold text-[#111827]/80">
            {usersByRole.map((r) => `${r.count} ${r.role}`).join(" · ")}
          </p>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Total Courses</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{totals.totalCourses}</p>
          <p className="mt-1 text-xs text-slate-700">
            {coursesByStatus.find((s) => s.status === "PENDING")?.count ?? 0} pending review
          </p>
        </div>

        <div className="nb-card-lilac p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Enrollments</span>
            <GraduationCap className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.totalEnrollments}
          </p>
          <p className="mt-1 text-xs font-medium text-[#111827]/80">
            {totals.completionRate}% completion rate ({totals.completedEnrollments} completed)
          </p>
        </div>

        <div className="nb-card p-5">
          <div className="flex items-center justify-between text-[#111827]">
            <span className="font-mono text-xs font-bold uppercase">Assessments</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">
            {totals.totalQuizAttempts}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            quiz attempts · {totals.gradedSubmissions}/{totals.totalSubmissions} graded
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="nb-card p-6">
          <h2 className="nb-heading text-base">Top Courses by Enrollment</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCourses.map((c) => ({
                  name: c.title.length > 18 ? `${c.title.slice(0, 18)}…` : c.title,
                  enrollments: c.enrollments
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#111827" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#111827" }} />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#111827" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nb-card p-6">
          <h2 className="nb-heading text-base">Courses by Lifecycle Status</h2>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coursesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#111827" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#111827" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#A9D8B8" stroke="#111827" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
