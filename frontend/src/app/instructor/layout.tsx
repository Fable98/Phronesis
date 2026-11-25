"use client";

import { BookOpen, ClipboardCheck, LayoutDashboard, PlusCircle } from "lucide-react";
import { DashboardShell, NavItem } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";

const INSTRUCTOR_NAV: NavItem[] = [
  { href: "/instructor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
  { href: "/instructor/courses/new", label: "Create Course", icon: PlusCircle },
  { href: "/instructor/submissions", label: "Grade Submissions", icon: ClipboardCheck }
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["INSTRUCTOR"]}>
      <DashboardShell title="Instructor Studio" navItems={INSTRUCTOR_NAV}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
