"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, LogOut, LucideIcon, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./Providers";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function DashboardShell({
  title,
  navItems,
  children
}: {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearch.trim();
    router.push(q ? `/courses?search=${encodeURIComponent(q)}` : "/courses");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5">
      <div>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-mono font-bold tracking-tight text-[#111827]"
        >
          <span className="flex h-9 w-9 items-center justify-center border-2 border-[#111827] bg-white shadow-[2px_2px_0px_#111827]">
            <GraduationCap className="h-5 w-5 text-[#111827]" />
          </span>
          <span>PHRONESIS</span>
        </Link>

        <p className="mt-6 px-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#111827]/70">
          {title}
        </p>

        <nav className="mt-2 space-y-1.5" aria-label={title}>
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold transition-all ${
                  active
                    ? "bg-[#111827] text-white shadow-[3px_3px_0px_#111827]"
                    : "text-[#111827] hover:bg-white/70 border-2 border-transparent hover:border-[#111827]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-8 border-t-2 border-[#111827]/20 pt-4 space-y-2">
        {user && (
          <div className="border-2 border-[#111827] bg-[#F5F3EC] px-3 py-2">
            <p className="truncate text-xs font-bold text-[#111827]">{user.name}</p>
            <p className="truncate text-[11px] font-mono text-slate-600">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-[#111827] hover:bg-white/80 border-2 border-transparent hover:border-[#111827] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F3EC] flex flex-col lg:flex-row">
      {/* Desktop Mint Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r-2 border-[#111827] bg-[#A9D8B8]">
        <div className="sticky top-0 h-screen overflow-y-auto">{sidebarContent}</div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between border-b-2 border-[#111827] bg-[#A9D8B8] px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-mono font-bold text-[#111827]">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-[#111827] bg-white">
            <GraduationCap className="h-4 w-4" />
          </span>
          PHRONESIS
        </Link>
        <button
          type="button"
          aria-label="Toggle workspace navigation"
          onClick={() => setMobileOpen((v) => !v)}
          className="border-2 border-[#111827] bg-white p-1.5 shadow-[2px_2px_0px_#111827]"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-b-2 border-[#111827] bg-[#A9D8B8]">
          {sidebarContent}
        </div>
      )}

      {/* Main Cream Workspace */}
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="border-b-2 border-[#111827] bg-[#F5F3EC] px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className="flex h-9 w-9 items-center justify-center border-2 border-[#111827] bg-white shadow-[2px_2px_0px_#111827] hover:bg-[#F8CE46]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="hidden sm:inline-block border-2 border-[#111827] bg-[#F0B7F3] px-2.5 py-1 font-mono text-xs font-bold uppercase text-[#111827]">
                {user?.role ?? "PORTAL"}
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-sm items-center">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#111827]" />
                <input
                  type="text"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Find courses, topics..."
                  className="w-full border-2 border-[#111827] bg-white py-1.5 pl-9 pr-3 text-sm text-[#111827] shadow-[2px_2px_0px_#111827] focus:outline-none"
                />
              </div>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
