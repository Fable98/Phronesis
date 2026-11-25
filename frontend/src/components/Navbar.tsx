"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./Providers";

function roleHomePath(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-[#111827] bg-[#A9D8B8]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-mono font-bold tracking-tight text-[#111827]"
          >
            <span className="flex h-9 w-9 items-center justify-center border-2 border-[#111827] bg-white shadow-[2px_2px_0px_#111827]">
              <GraduationCap className="h-5 w-5 text-[#111827]" />
            </span>
            <span>PHRONESIS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2 text-sm font-bold text-[#111827]">
            <Link
              href="/courses"
              className="flex items-center gap-1.5 border-2 border-transparent px-3 py-1.5 hover:border-[#111827] hover:bg-white transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Course Catalog
            </Link>
            {user && (
              <Link
                href={roleHomePath(user.role)}
                className="border-2 border-transparent px-3 py-1.5 hover:border-[#111827] hover:bg-white transition-colors"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="border-2 border-[#111827] bg-[#F5F3EC] px-3 py-1 text-xs font-bold text-[#111827]">
                {user.name} · {user.role}
              </span>
              <Link href={roleHomePath(user.role)} className="nb-btn-primary text-xs">
                Workspace
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="nb-btn-secondary text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nb-btn-secondary text-xs">
                Sign in
              </Link>
              <Link href="/register" className="nb-btn-primary text-xs">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden border-2 border-[#111827] bg-white p-2 text-[#111827] shadow-[2px_2px_0px_#111827]"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t-2 border-[#111827] bg-[#F5F3EC] px-4 py-4 md:hidden space-y-3">
          <Link
            href="/courses"
            onClick={() => setOpen(false)}
            className="block border-2 border-[#111827] bg-white px-3 py-2 text-sm font-bold text-[#111827]"
          >
            Course Catalog
          </Link>
          {user ? (
            <>
              <Link
                href={roleHomePath(user.role)}
                onClick={() => setOpen(false)}
                className="block border-2 border-[#111827] bg-[#111827] px-3 py-2 text-sm font-bold text-white"
              >
                Go to {user.role} Workspace
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void handleLogout();
                }}
                className="w-full text-left border-2 border-[#111827] bg-white px-3 py-2 text-sm font-bold text-[#111827]"
              >
                Sign out ({user.name})
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 border-2 border-[#111827] bg-white px-3 py-2 text-center text-sm font-bold text-[#111827]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex-1 border-2 border-[#111827] bg-[#111827] px-3 py-2 text-center text-sm font-bold text-white"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
