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
          <h1 className="nb-heading text-3xl">Course Moderation</h1>
          <p className="text-sm text-slate-700">
            Review pending course submissions, approve for publication, or request revisions.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter courses by status"
          className="nb-input w-auto"
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
        <div
          className="border-2 border-[#111827] bg-red-100 px-4 py-3 text-sm font-bold text-[#111827]"
          role="alert"
        >
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
            <div key={course.id} className="nb-card p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={course.status} />
                    <StatusBadge value={course.difficultyLevel} />
                    <span className="border-2 border-[#111827] bg-[#F5F3EC] px-2 py-0.5 font-mono text-[11px] font-bold">
                      {course.category}
                    </span>
                  </div>
                  <h2 className="mt-3 nb-heading text-lg">{course.title}</h2>
                  <p className="mt-1 text-sm text-slate-700">{course.description}</p>
                  <p className="mt-2 font-mono text-xs text-slate-700">
                    Instructor: <strong>{course.instructor?.name}</strong> (
                    {course.instructor?.email}) · {course._count?.modules ?? 0} modules ·{" "}
                    {course._count?.enrollments ?? 0} enrolled
                  </p>
                  {course.rejectionReason && (
                    <p className="mt-2 font-mono text-xs font-bold text-red-700">
                      Rejection reason: {course.rejectionReason}
                    </p>
                  )}
                </div>

                {course.status !== "ARCHIVED" && (
                  <button
                    type="button"
                    onClick={() => archiveMutation.mutate(course.id)}
                    className="nb-btn-secondary text-xs"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                )}
              </div>

              {course.status === "PENDING" && (
                <div className="flex flex-wrap items-center gap-3 border-t-2 border-[#111827]/15 pt-4">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ courseId: course.id, decision: "APPROVE" })
                    }
                    className="inline-flex items-center gap-1.5 border-2 border-[#111827] bg-[#A9D8B8] px-3.5 py-2 font-mono text-xs font-bold text-[#111827] shadow-[3px_3px_0px_#111827] hover:bg-[#85C49A]"
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
                    className="nb-input flex-1 min-w-[200px]"
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
                    className="inline-flex items-center gap-1.5 border-2 border-[#111827] bg-red-200 px-3.5 py-2 font-mono text-xs font-bold text-[#111827] shadow-[3px_3px_0px_#111827] hover:bg-red-300"
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
