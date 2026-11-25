"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, XCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, StatusBadge, SuccessBanner } from "@/components/UiStates";
import { ApiError, apiRequest } from "@/lib/api";
import { Course, CourseStatus } from "@/lib/types";

export default function AdminCoursesModerationPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const params = new URLSearchParams({ scope: "admin", pageSize: "50" });
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "courses", statusFilter],
    queryFn: async () => {
      const res = await apiRequest<{ courses: Course[] }>(`/courses?${params.toString()}`);
      return res.data.courses;
    }
  });

  const refresh = async (msg: string) => {
    setErrorMsg(null);
    setBanner(msg);
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics", "platform"] });
  };

  const reviewMutation = useMutation({
    mutationFn: ({
      courseId,
      decision,
      rejectionReason
    }: {
      courseId: string;
      decision: "APPROVE" | "REJECT";
      rejectionReason?: string;
    }) =>
      apiRequest(`/courses/${courseId}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          ...(decision === "REJECT" ? { rejectionReason } : {})
        })
      }),
    onSuccess: (_res, vars) =>
      refresh(vars.decision === "APPROVE" ? "Course approved and published!" : "Course rejected."),
    onError: (err) => setErrorMsg(err instanceof ApiError ? err.message : "Review failed")
  });

  const archiveMutation = useMutation({
    mutationFn: (courseId: string) =>
      apiRequest(`/courses/${courseId}/archive`, { method: "POST" }),
    onSuccess: () => refresh("Course archived."),
    onError: (err) => setErrorMsg(err instanceof ApiError ? err.message : "Archive failed")
  });

  if (isLoading) return <LoadingState message="Loading courses for moderation..." />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const courses = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Moderation</h1>
          <p className="text-sm text-slate-600">
            Review pending course submissions, approve for publication, or request revisions.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter courses by status"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {(["PENDING", "PUBLISHED", "DRAFT", "REJECTED", "ARCHIVED"] as CourseStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
      </div>

      {banner && <SuccessBanner message={banner} />}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errorMsg}
        </div>
      )}

      {courses.length === 0 ? (
        <EmptyState
          title="No courses in this status"
          description="Try choosing a different status filter."
        />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={course.status} />
                    <StatusBadge value={course.difficultyLevel} />
                    <span className="text-xs text-slate-500">{course.category}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{course.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{course.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Instructor: <strong>{course.instructor?.name}</strong> ({course.instructor?.email}) ·{" "}
                    {course._count?.modules ?? 0} modules · {course._count?.enrollments ?? 0} enrolled
                  </p>
                  {course.rejectionReason && (
                    <p className="mt-2 text-xs text-red-700">
                      Rejection reason: {course.rejectionReason}
                    </p>
                  )}
                </div>

                {course.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    onClick={() => archiveMutation.mutate(course.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                )}
              </div>

              {course.status === "PENDING" && (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ courseId: course.id, decision: "APPROVE" })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Publish
                  </button>
                  <input
                    type="text"
                    placeholder="Rejection reason (required to reject)..."
                    value={rejectReasons[course.id] ?? ""}
                    onChange={(e) =>
                      setRejectReasons((prev) => ({ ...prev, [course.id]: e.target.value }))
                    }
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        courseId: course.id,
                        decision: "REJECT",
                        rejectionReason: rejectReasons[course.id] ?? ""
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
