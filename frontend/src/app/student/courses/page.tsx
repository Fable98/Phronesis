"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Enrollment } from "@/lib/types";

export default function StudentCoursesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["enrollments", "my"],
    queryFn: async () => {
      const res = await apiRequest<{ enrollments: Enrollment[] }>("/enrollments/my");
      return res.data.enrollments;
    }
  });

  const dropMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      return apiRequest(`/enrollments/${enrollmentId}/drop`, { method: "PATCH" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "my"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "student"] });
    }
  });

  if (isLoading) return <LoadingState message="Loading your enrolled courses..." />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const enrollments = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Enrolled Courses</h1>
          <p className="text-sm text-slate-600">Resume lessons, submit work, and take quizzes.</p>
        </div>
        <Link
          href="/courses"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Find More Courses
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title="No active enrollments"
          description="Enroll in a published course from the catalog to begin."
          action={
            <Link
              href="/courses"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Browse Courses
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {enrollments.map((enrollment) => {
            const pct = enrollment.progress?.percentage ?? 0;
            return (
              <div
                key={enrollment.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase text-brand-600">
                      {enrollment.course?.category}
                    </span>
                    <StatusBadge value={enrollment.status} />
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    {enrollment.course?.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Instructor: {enrollment.course?.instructor?.name ?? "Faculty"}
                  </p>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Progress</span>
                      <span>
                        {enrollment.progress?.completedLessons ?? 0}/
                        {enrollment.progress?.totalLessons ?? 0} lessons ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <Link
                    href={`/student/courses/${enrollment.courseId}/learn`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Open Course Player
                  </Link>
                  <button
                    type="button"
                    disabled={dropMutation.isPending}
                    onClick={() => dropMutation.mutate(enrollment.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Drop Course
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
