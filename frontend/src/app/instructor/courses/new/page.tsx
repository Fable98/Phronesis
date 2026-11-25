"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError, apiRequest } from "@/lib/api";
import { createCourseSchema } from "@/lib/schemas";
import { Course } from "@/lib/types";

type FormValues = z.infer<typeof createCourseSchema>;

export default function NewInstructorCoursePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      difficultyLevel: "BEGINNER",
      category: "Backend Engineering"
    }
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const { data } = await apiRequest<{ course: Course }>("/courses", {
        method: "POST",
        body: JSON.stringify(values)
      });
      router.push(`/instructor/courses/${data.course.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to create course");
    }
  };

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Create New Course</h1>
      <p className="mt-1 text-sm text-slate-600">
        New courses start in DRAFT. Add modules, lessons, and assessments before submitting for review.
      </p>

      {serverError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Course Title
          </label>
          <input
            id="title"
            type="text"
            {...register("title")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <input
              id="category"
              type="text"
              {...register("category")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            {errors.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="difficultyLevel" className="block text-sm font-medium text-slate-700">
              Difficulty Level
            </label>
            <select
              id="difficultyLevel"
              {...register("difficultyLevel")}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register("description")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create Draft Course"}
        </button>
      </form>
    </div>
  );
}
