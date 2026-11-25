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
    <div className="max-w-2xl nb-card p-8">
      <div className="inline-block border-2 border-[#111827] bg-[#F8CE46] px-2.5 py-0.5 font-mono text-xs font-bold uppercase">
        New Draft
      </div>
      <h1 className="mt-3 nb-heading text-2xl">Create New Course</h1>
      <p className="mt-1 text-sm text-slate-700">
        New courses start in DRAFT. Add modules, lessons, and assessments before submitting for review.
      </p>

      {serverError && (
        <div
          className="mt-4 border-2 border-[#111827] bg-red-100 px-3 py-2 text-sm font-bold text-[#111827]"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block font-mono text-xs font-bold uppercase text-[#111827]">
            Course Title
          </label>
          <input id="title" type="text" {...register("title")} className="nb-input mt-1" />
          {errors.title && <p className="mt-1 text-xs font-bold text-red-700">{errors.title.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="block font-mono text-xs font-bold uppercase text-[#111827]">
              Category
            </label>
            <input id="category" type="text" {...register("category")} className="nb-input mt-1" />
            {errors.category && (
              <p className="mt-1 text-xs font-bold text-red-700">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="difficultyLevel" className="block font-mono text-xs font-bold uppercase text-[#111827]">
              Difficulty Level
            </label>
            <select id="difficultyLevel" {...register("difficultyLevel")} className="nb-input mt-1">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block font-mono text-xs font-bold uppercase text-[#111827]">
            Description
          </label>
          <textarea id="description" rows={4} {...register("description")} className="nb-input mt-1" />
          {errors.description && (
            <p className="mt-1 text-xs font-bold text-red-700">{errors.description.message}</p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="nb-btn-primary">
          {isSubmitting ? "Creating..." : "Create Draft Course"}
        </button>
      </form>
    </div>
  );
}
