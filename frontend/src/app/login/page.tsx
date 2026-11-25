"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/components/Providers";
import { ApiError } from "@/lib/api";
import { loginSchema } from "@/lib/schemas";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      if (user.role === "ADMIN") router.push("/admin");
      else if (user.role === "INSTRUCTOR") router.push("/instructor");
      else router.push("/student");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to sign in");
    }
  };

  const fillDemo = (email: string) => {
    setValue("email", email);
    setValue("password", "Phronesis123!");
  };

  return (
    <div className="min-h-screen bg-[#F5F3EC]">
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="nb-card p-8">
          <div className="inline-block border-2 border-[#111827] bg-[#F8CE46] px-2.5 py-0.5 font-mono text-xs font-bold uppercase">
            Member Access
          </div>
          <h1 className="mt-3 nb-heading text-2xl">Sign in to Phronesis</h1>
          <p className="mt-1 text-sm text-slate-700">
            Access your courses, assignments, quizzes, and analytics.
          </p>

          {serverError && (
            <div
              className="mt-4 border-2 border-[#111827] bg-red-100 px-3 py-2 text-sm font-bold text-[#111827]"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="nb-input mt-1"
              />
              {errors.email && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="nb-input mt-1"
              />
              {errors.password && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="nb-btn-primary w-full"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-700">
            New student?{" "}
            <Link href="/register" className="font-bold text-[#111827] underline">
              Create an account
            </Link>
          </p>

          <div className="mt-6 border-2 border-[#111827] bg-[#F0B7F3] p-4">
            <p className="font-mono text-xs font-bold uppercase text-[#111827]">
              Seeded Credentials (Phronesis123!)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fillDemo("student1@phronesis.edu")}
                className="border-2 border-[#111827] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#111827] hover:bg-[#F8CE46]"
              >
                Student 1
              </button>
              <button
                type="button"
                onClick={() => fillDemo("marcus.chen@phronesis.edu")}
                className="border-2 border-[#111827] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#111827] hover:bg-[#F8CE46]"
              >
                Instructor
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@phronesis.edu")}
                className="border-2 border-[#111827] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#111827] hover:bg-[#F8CE46]"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
