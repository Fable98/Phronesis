"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Enrollment } from "@/lib/types";

export default function AdminEnrollmentsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "enrollments", statusFilter, page],
    queryFn: async () =>
      apiRequest<{ enrollments: Enrollment[] }>(`/enrollments?${params.toString()}`)
  });

  if (isLoading) return <LoadingState message="Loading enrollments..." />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const enrollments = data?.data.enrollments ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Enrollments</h1>
          <p className="text-sm text-slate-600">
            Monitor student progress and enrollment statuses across all courses.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="DROPPED">DROPPED</option>
        </select>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments found"
          description="No enrollments match the selected filter."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2.5 pr-4">Student</th>
                <th className="py-2.5 pr-4">Course</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5 pr-4">Progress</th>
                <th className="py-2.5">Last Accessed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{e.student?.name}</p>
                    <p className="text-xs text-slate-500">{e.student?.email}</p>
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-800">{e.course?.title}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge value={e.status} />
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-900">
                    {e.progress?.percentage ?? 0}%
                  </td>
                  <td className="py-3 text-xs text-slate-500">
                    {new Date(e.lastAccessedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} enrollments)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
