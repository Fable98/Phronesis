"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clock, FileText, PlayCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/components/Providers";
import { ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { ApiError, apiRequest, getAuthorizedFileUrl } from "@/lib/api";
import { Course, Enrollment } from "@/lib/types";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["course", params.id],
    queryFn: async () => {
      const res = await apiRequest<{ course: Course; enrollment: Enrollment | null }>(
        `/courses/${params.id}`
      );
      return res.data;
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ enrollment: Enrollment }>("/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId: params.id })
      });
    },
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["course", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "my"] });
      router.push(`/student/courses/${params.id}/learn`);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Failed to enroll");
    }
  });

  const course = data?.course;
  const enrollment = data?.enrollment;
  const isEnrolled = enrollment !== null && enrollment !== undefined && enrollment.status !== "DROPPED";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        <div className="mt-6">
          {isLoading ? (
            <LoadingState message="Loading course syllabus..." />
          ) : isError || !course ? (
            <ErrorState
              message={isError ? (error as Error).message : "Course not found"}
              onRetry={() => refetch()}
            />
          ) : (
            <div className="space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {course.category}
                  </span>
                  <StatusBadge value={course.difficultyLevel} />
                  <StatusBadge value={course.status} />
                </div>

                <h1 className="mt-3 text-3xl font-bold text-slate-900">{course.title}</h1>
                <p className="mt-3 text-slate-600 leading-relaxed">{course.description}</p>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                  <div className="text-sm text-slate-600">
                    Instructor:{" "}
                    <strong className="font-semibold text-slate-900">
                      {course.instructor?.name ?? "Faculty"}
                    </strong>
                    {course.instructor?.bio && (
                      <p className="mt-0.5 text-xs text-slate-500">{course.instructor.bio}</p>
                    )}
                  </div>

                  <div>
                    {!user ? (
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Sign in to Enroll
                      </Link>
                    ) : user.role === "STUDENT" ? (
                      isEnrolled ? (
                        <Link
                          href={`/student/courses/${course.id}/learn`}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Continue Learning
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={enrollMutation.isPending}
                          onClick={() => enrollMutation.mutate()}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                          {enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}
                        </button>
                      )
                    ) : (
                      <Link
                        href={user.role === "ADMIN" ? "/admin/courses" : `/instructor/courses/${course.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Manage Course
                      </Link>
                    )}
                  </div>
                </div>

                {actionError && (
                  <p className="mt-3 text-sm text-red-600" role="alert">
                    {actionError}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-600" />
                  Course Syllabus
                </h2>

                {!course.modules || course.modules.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No modules added yet.</p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {course.modules.map((mod) => (
                      <div key={mod.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-900">
                          {mod.position}. {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="mt-1 text-xs text-slate-600">{mod.description}</p>
                        )}
                        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                          {mod.lessons.map((lesson) => (
                            <li
                              key={lesson.id}
                              className="flex items-center justify-between px-4 py-2.5 text-sm"
                            >
                              <span className="font-medium text-slate-800">{lesson.title}</span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3.5 w-3.5" />
                                {lesson.durationMinutes} min
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {course.materials && course.materials.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-600" />
                    Course Materials
                  </h2>
                  <ul className="mt-4 space-y-2">
                    {course.materials.map((mat) => (
                      <li
                        key={mat.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{mat.title}</p>
                          <p className="text-xs text-slate-500">{mat.file.originalName}</p>
                        </div>
                        {isEnrolled || user?.role === "ADMIN" || user?.id === course.instructorId ? (
                          <a
                            href={getAuthorizedFileUrl(mat.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Enroll to access</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
