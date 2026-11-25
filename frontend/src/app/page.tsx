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
    <div className="min-h-screen bg-[#F5F3EC]">
      <Navbar />

      <section className="border-b-2 border-[#111827] bg-[#F5F3EC]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 nb-card-mustard p-8 sm:p-10">
              <span className="inline-flex items-center gap-1.5 border-2 border-[#111827] bg-white px-3 py-1 font-mono text-xs font-bold uppercase text-[#111827]">
                <GraduationCap className="h-3.5 w-3.5" />
                Phronesis LMS Platform
              </span>
              <h1 className="mt-5 font-mono text-3xl font-bold tracking-tight text-[#111827] sm:text-5xl">
                Practical mastery, structured courses, and real-time assessment.
              </h1>
              <p className="mt-4 text-base font-medium text-[#111827]/90">
                Phronesis connects students, instructors, and administrators in one crisp workspace
                with structured modules, timed quizzes, graded assignments, and verified progress.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/courses" className="nb-btn-primary">
                  Browse Courses
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/register" className="nb-btn-secondary">
                  Create Student Account
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="nb-card-lilac p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-[#111827]">3 Roles</span>
                  <ShieldCheck className="h-6 w-6 text-[#111827]" />
                </div>
                <p className="mt-2 text-sm font-medium text-[#111827]">
                  Dedicated Student, Instructor, and Admin workspaces backed by strict RBAC and CSRF protection.
                </p>
              </div>

              <div className="nb-card p-5">
                <div className="flex items-center gap-2 font-mono text-base font-bold text-[#111827]">
                  <BookOpen className="h-5 w-5" />
                  Structured Curriculum
                </div>
                <p className="mt-1.5 text-sm text-slate-700">
                  Modular lessons, video embeds, downloadable course materials, and server-verified completion tracking.
                </p>
              </div>

              <div className="nb-card p-5">
                <div className="flex items-center gap-2 font-mono text-base font-bold text-[#111827]">
                  <CheckCircle2 className="h-5 w-5" />
                  Assignments & Timed Quizzes
                </div>
                <p className="mt-1.5 text-sm text-slate-700">
                  Rubric grading, resubmission limits, late policies, and automatic server-side quiz scoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="nb-heading text-2xl">Popular Published Courses</h2>
            <p className="mt-1 text-sm text-slate-700">Live courses available for enrollment today.</p>
          </div>
          <Link href="/courses" className="nb-btn-secondary text-xs">
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
              {data.map((course, idx) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className={`group flex flex-col justify-between border-2 border-[#111827] p-6 shadow-[4px_4px_0px_#111827] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                    idx === 0 ? "bg-[#F8CE46]" : idx === 1 ? "bg-white" : "bg-[#F0B7F3]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="border-2 border-[#111827] bg-white px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#111827]">
                        {course.category}
                      </span>
                      <StatusBadge value={course.difficultyLevel} />
                    </div>
                    <h3 className="mt-4 font-mono text-lg font-bold text-[#111827] group-hover:underline">
                      {course.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-[#111827]/85">{course.description}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t-2 border-[#111827]/20 pt-4 font-mono text-xs font-bold text-[#111827]">
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
