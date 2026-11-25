"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EmptyState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Course } from "@/lib/types";

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public", "featured-courses"],
    queryFn: async () => {
      const res = await apiRequest<{ courses: Course[] }>("/courses?page=1&pageSize=3&sort=popular");
      return res.data.courses;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <GraduationCap className="h-3.5 w-3.5" />
              Phronesis LMS Platform
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Practical mastery, structured courses, and real-time assessment.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Phronesis connects students, instructors, and administrators in one unified workspace
              with structured modules, timed quizzes, graded assignments, and verified progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Browse Courses
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Create Student Account
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <BookOpen className="h-6 w-6 text-brand-600" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Structured Curriculum</h2>
              <p className="mt-1 text-sm text-slate-600">
                Modular lessons, video embeds, downloadable course materials, and server-verified completion tracking.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Assignments & Timed Quizzes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Rubric-based grading, resubmission limits, late policies, and automatic server-side quiz scoring.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Role-Based Governance</h2>
              <p className="mt-1 text-sm text-slate-600">
                Course approval lifecycle, instructor analytics, and secure role-isolated access control.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Popular Published Courses</h2>
            <p className="mt-1 text-sm text-slate-600">Live courses available for enrollment today.</p>
          </div>
          <Link
            href="/courses"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <LoadingState message="Loading featured courses..." />
          ) : !data || data.length === 0 ? (
            <EmptyState
              title="No published courses yet"
              description="Instructors are preparing new courses. Check back soon!"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {data.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                        {course.category}
                      </span>
                      <StatusBadge value={course.difficultyLevel} />
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-brand-700">
                      {course.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course.description}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>{course.instructor?.name ?? "Phronesis Faculty"}</span>
                    <span>{course._count?.enrollments ?? 0} enrolled</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
