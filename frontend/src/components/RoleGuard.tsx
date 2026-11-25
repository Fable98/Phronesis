"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/lib/types";
import { useAuth } from "./Providers";
import { LoadingState } from "./UiStates";

function roleHome(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/student";
}

export function RoleGuard({
  allowedRoles,
  children
}: {
  allowedRoles: Role[];
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [user, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <LoadingState message="Verifying session..." />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
