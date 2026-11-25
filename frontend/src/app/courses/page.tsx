"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { Course } from "@/lib/types";

function CatalogContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
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
    queryFn: async () => apiRequest<{ courses: Course[] }>(`/courses?${params.toString()}`)
  });

  const courses = data?.data.courses ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="nb-card-mustard p-6">
        <h1 className="nb-heading text-3xl">Course Catalog</h1>
        <p className="mt-1 text-sm font-medium text-[#111827]/90">
          Explore published Phronesis courses across engineering, data science, and security.
        </p>
      </div>

      <div className="mt-6 grid gap-3 nb-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#111827]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search title or description..."
            aria-label="Search courses"
            className="nb-input pl-9"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by category"
          className="nb-input"
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
          className="nb-input"
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
          className="nb-input"
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
                  className="group nb-card flex flex-col justify-between p-6 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FFFDF5]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="border-2 border-[#111827] bg-[#F0B7F3] px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#111827]">
                        {course.category}
                      </span>
                      <StatusBadge value={course.difficultyLevel} />
                    </div>
                    <h2 className="mt-4 font-mono text-lg font-bold text-[#111827] group-hover:underline">
                      {course.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-700">{course.description}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t-2 border-[#111827]/15 pt-4 font-mono text-xs font-bold text-[#111827]">
                    <span>{course.instructor?.name ?? "Faculty"}</span>
                    <span>
                      {course._count?.modules ?? 0} mod · {course._count?.enrollments ?? 0} enrolled
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <p className="font-mono text-xs font-bold text-[#111827]">
                  Page {meta.page} of {meta.totalPages} ({meta.total} courses)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="nb-btn-secondary text-xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="nb-btn-secondary text-xs"
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
  );
}

export default function CoursesCatalogPage() {
  return (
    <div className="min-h-screen bg-[#F5F3EC]">
      <Navbar />
      <Suspense fallback={<div className="mx-auto max-w-7xl p-8"><LoadingState /></div>}>
        <CatalogContent />
      </Suspense>
    </div>
  );
}
