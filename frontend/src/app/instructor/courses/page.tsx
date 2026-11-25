"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, PlusCircle, Send, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Course } from "@/lib/types";

export default function InstructorCoursesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["instructor", "courses"],
    queryFn: async () => {
      const res = await apiRequest<{ courses: Course[] }>("/courses?mine=true&pageSize=50");
      return res.data.courses;
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (courseId: string) =>
      apiRequest(`/courses/${courseId}/submit`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "instructor"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) =>
      apiRequest(`/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "instructor"] });
    }
  });

  if (isLoading) return <LoadingState message="Loading your courses..." />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const courses = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="nb-heading text-3xl">My Courses</h1>
          <p className="text-sm text-slate-700">
            Manage curriculum, submit drafts for approval, or archive older courses.
          </p>
        </div>
        <Link href="/instructor/courses/new" className="nb-btn-primary text-xs">
          <PlusCircle className="h-4 w-4" />
          Create Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Start building your first Phronesis course."
          action={
            <Link href="/instructor/courses/new" className="nb-btn-primary text-xs">
              Create Course
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="nb-card p-6">
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
                  {course.status === "REJECTED" && course.rejectionReason && (
                    <div className="mt-3 border-2 border-[#111827] bg-red-100 px-3 py-2 text-xs font-bold text-[#111827]">
                      Rejection Feedback: {course.rejectionReason} (Edit course to return to DRAFT)
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/instructor/courses/${course.id}`}
                    className="nb-btn-secondary text-xs"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Course Editor
                  </Link>
                  {course.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={submitMutation.isPending}
                      onClick={() => submitMutation.mutate(course.id)}
                      className="nb-btn-primary text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit for Review
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(course.id)}
                    className="nb-btn-secondary text-xs hover:bg-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {(course._count?.enrollments ?? 0) > 0 ? "Archive" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
