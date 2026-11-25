"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Course } from "@/lib/types";

export default function CoursesCatalogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "9",
    sort
  });
  if (search.trim()) params.set("search", search.trim());
  if (category) params.set("category", category);
  if (difficultyLevel) params.set("difficultyLevel", difficultyLevel);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["courses", "catalog", search, category, difficultyLevel, sort, page],
    queryFn: async () => {
      return apiRequest<{ courses: Course[] }>(`/courses?${params.toString()}`);
    }
  });

  const courses = data?.data.courses ?? [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Course Catalog</h1>
          <p className="mt-1 text-sm text-slate-600">
            Explore published Phronesis courses across engineering, data science, and security.
          </p>
        </div>

        <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or description..."
              aria-label="Search courses"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Backend Engineering">Backend Engineering</option>
            <option value="Frontend Engineering">Frontend Engineering</option>
            <option value="Data Science">Data Science</option>
            <option value="Databases">Databases</option>
            <option value="Security">Security</option>
          </select>

          <select
            value={difficultyLevel}
            onChange={(e) => {
              setDifficultyLevel(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by difficulty"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort courses"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <LoadingState message="Fetching published courses..." />
          ) : isError ? (
            <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
          ) : courses.length === 0 ? (
            <EmptyState
              title="No courses match your filters"
              description="Try clearing your search query or selecting a different category."
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
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
                      <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-brand-700">
                        {course.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course.description}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <span>{course.instructor?.name ?? "Faculty"}</span>
                      <span>
                        {course._count?.modules ?? 0} modules · {course._count?.enrollments ?? 0} enrolled
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Page {meta.page} of {meta.totalPages} ({meta.total} courses)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
