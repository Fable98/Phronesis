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
import { registerSchema } from "@/lib/schemas";

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        ...(values.bio ? { bio: values.bio } : {})
      });
      router.push("/student");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EC]">
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="nb-card p-8">
          <div className="inline-block border-2 border-[#111827] bg-[#A9D8B8] px-2.5 py-0.5 font-mono text-xs font-bold uppercase">
            Student Sign Up
          </div>
          <h1 className="mt-3 nb-heading text-2xl">Create a Student Account</h1>
          <p className="mt-1 text-sm text-slate-700">
            Join Phronesis to enroll in courses and track your learning progress.
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
              <label htmlFor="name" className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                {...register("name")}
                className="nb-input mt-1"
              />
              {errors.name && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.name.message}</p>
              )}
            </div>

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
                autoComplete="new-password"
                {...register("password")}
                className="nb-input mt-1"
              />
              {errors.password && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="bio" className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Bio (optional)
              </label>
              <textarea id="bio" rows={2} {...register("bio")} className="nb-input mt-1" />
            </div>

            <button type="submit" disabled={isSubmitting} className="nb-btn-primary w-full">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-700">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#111827] underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
