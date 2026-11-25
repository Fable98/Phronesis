"use client";

import { Award, BookOpen, Compass, LayoutDashboard } from "lucide-react";
import { DashboardShell, NavItem } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";

const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/student/courses", label: "My Courses", icon: BookOpen },
  { href: "/student/grades", label: "Grades & Quizzes", icon: Award },
  { href: "/courses", label: "Browse Catalog", icon: Compass }
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <DashboardShell title="Student Portal" navItems={STUDENT_NAV}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
