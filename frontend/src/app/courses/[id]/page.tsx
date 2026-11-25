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
    mutationFn: async () =>
      apiRequest<{ enrollment: Enrollment }>("/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId: params.id })
      }),
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
  const isEnrolled =
    enrollment !== null && enrollment !== undefined && enrollment.status !== "DROPPED";

  return (
    <div className="min-h-screen bg-[#F5F3EC]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/courses" className="nb-btn-secondary text-xs">
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
              <div className="nb-card-mustard p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border-2 border-[#111827] bg-white px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-[#111827]">
                    {course.category}
                  </span>
                  <StatusBadge value={course.difficultyLevel} />
                  <StatusBadge value={course.status} />
                </div>

                <h1 className="mt-4 nb-heading text-3xl">{course.title}</h1>
                <p className="mt-3 text-sm font-medium leading-relaxed text-[#111827]/90">
                  {course.description}
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border-2 border-[#111827] bg-[#F8CE46] p-3">
                    <p className="font-mono text-xl font-bold">{course.modules?.length ?? 0}</p>
                    <p className="text-xs font-medium">modules</p>
                  </div>
                  <div className="border-2 border-[#111827] bg-[#F8CE46] p-3">
                    <p className="font-mono text-xl font-bold">
                      {course._count?.enrollments ?? 0}
                    </p>
                    <p className="text-xs font-medium">students enrolled</p>
                  </div>
                  <div className="border-2 border-[#111827] bg-[#F8CE46] p-3">
                    <p className="font-mono text-xl font-bold">
                      {course._count?.quizzes ?? 0}
                    </p>
                    <p className="text-xs font-medium">assessments</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t-2 border-[#111827] pt-5">
                  <div className="text-sm">
                    <p className="font-mono font-bold text-[#111827]">
                      Instructor: {course.instructor?.name ?? "Faculty"}
                    </p>
                    {course.instructor?.bio && (
                      <p className="mt-0.5 text-xs text-[#111827]/80">{course.instructor.bio}</p>
                    )}
                  </div>

                  <div>
                    {!user ? (
                      <Link href="/login" className="nb-btn-primary">
                        Sign in to Enroll
                      </Link>
                    ) : user.role === "STUDENT" ? (
                      isEnrolled ? (
                        <Link
                          href={`/student/courses/${course.id}/learn`}
                          className="nb-btn-primary"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Continue Learning
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={enrollMutation.isPending}
                          onClick={() => enrollMutation.mutate()}
                          className="nb-btn-primary"
                        >
                          {enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}
                        </button>
                      )
                    ) : (
                      <Link
                        href={
                          user.role === "ADMIN"
                            ? "/admin/courses"
                            : `/instructor/courses/${course.id}`
                        }
                        className="nb-btn-secondary"
                      >
                        Manage Course
                      </Link>
                    )}
                  </div>
                </div>

                {actionError && (
                  <p className="mt-3 text-sm font-bold text-red-800" role="alert">
                    {actionError}
                  </p>
                )}
              </div>

              <div className="nb-card p-8">
                <h2 className="nb-heading text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Syllabus
                </h2>

                {!course.modules || course.modules.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-600">No modules added yet.</p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {course.modules.map((mod) => (
                      <div key={mod.id} className="border-2 border-[#111827] bg-[#F5F3EC] p-4">
                        <h3 className="font-mono font-bold text-[#111827]">
                          {mod.position}. {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="mt-1 text-xs text-slate-700">{mod.description}</p>
                        )}
                        <ul className="mt-3 divide-y-2 divide-[#111827]/15 border-2 border-[#111827] bg-white">
                          {mod.lessons.map((lesson) => (
                            <li
                              key={lesson.id}
                              className="flex items-center justify-between px-4 py-2.5 text-sm"
                            >
                              <span className="font-medium text-[#111827]">{lesson.title}</span>
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
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
                <div className="nb-card p-8">
                  <h2 className="nb-heading text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Course Materials
                  </h2>
                  <ul className="mt-4 space-y-2">
                    {course.materials.map((mat) => (
                      <li
                        key={mat.id}
                        className="flex items-center justify-between border-2 border-[#111827] bg-[#F5F3EC] px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-bold text-[#111827]">{mat.title}</p>
                          <p className="font-mono text-xs text-slate-600">{mat.file.originalName}</p>
                        </div>
                        {isEnrolled || user?.role === "ADMIN" || user?.id === course.instructorId ? (
                          <a
                            href={getAuthorizedFileUrl(mat.file.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="nb-btn-secondary text-xs"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="font-mono text-xs font-bold text-slate-500">
                            Enroll to access
                          </span>
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
