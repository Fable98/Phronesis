"use client";

import { BookCheck, GraduationCap, LayoutDashboard, Users } from "lucide-react";
import { DashboardShell, NavItem } from "@/components/DashboardShell";
import { RoleGuard } from "@/components/RoleGuard";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Platform Analytics", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users & Roles", icon: Users },
  { href: "/admin/courses", label: "Course Moderation", icon: BookCheck },
  { href: "/admin/enrollments", label: "Enrollments", icon: GraduationCap }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <DashboardShell title="Admin Console" navItems={ADMIN_NAV}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
