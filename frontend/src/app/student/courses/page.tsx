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
    mutationFn: async (enrollmentId: string) =>
      apiRequest(`/enrollments/${enrollmentId}/drop`, { method: "PATCH" }),
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="nb-heading text-3xl">My Enrolled Courses</h1>
          <p className="text-sm text-slate-700">Resume lessons, submit work, and take quizzes.</p>
        </div>
        <Link href="/courses" className="nb-btn-primary text-xs">
          Find More Courses
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          title="No active enrollments"
          description="Enroll in a published course from the catalog to begin."
          action={
            <Link href="/courses" className="nb-btn-primary text-xs">
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
                className="nb-card flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="border-2 border-[#111827] bg-[#F8CE46] px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#111827]">
                      {enrollment.course?.category}
                    </span>
                    <StatusBadge value={enrollment.status} />
                  </div>
                  <h2 className="mt-3 font-mono text-lg font-bold text-[#111827]">
                    {enrollment.course?.title}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    Instructor: {enrollment.course?.instructor?.name ?? "Faculty"}
                  </p>

                  <div className="mt-4">
                    <div className="flex justify-between font-mono text-xs font-bold text-[#111827]">
                      <span>Progress</span>
                      <span>
                        {enrollment.progress?.completedLessons ?? 0}/
                        {enrollment.progress?.totalLessons ?? 0} lessons ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 w-full border-2 border-[#111827] bg-[#F5F3EC]">
                      <div
                        className="h-full bg-[#A9D8B8] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-[#111827]/15 pt-4">
                  <Link
                    href={`/student/courses/${enrollment.courseId}/learn`}
                    className="nb-btn-primary text-xs"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Open Course Player
                  </Link>
                  <button
                    type="button"
                    disabled={dropMutation.isPending}
                    onClick={() => dropMutation.mutate(enrollment.id)}
                    className="nb-btn-secondary text-xs hover:bg-red-200"
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
