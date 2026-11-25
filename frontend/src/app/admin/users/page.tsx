"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, UserPlus } from "lucide-react";
import { ErrorState, LoadingState, StatusBadge, SuccessBanner } from "@/components/UiStates";
import { ApiError, apiRequest } from "@/lib/api";
import { createUserSchema } from "@/lib/schemas";
import { Role, User } from "@/lib/types";

type CreateUserValues = z.infer<typeof createUserSchema>;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (search.trim()) params.set("search", search.trim());
  if (roleFilter) params.set("role", roleFilter);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", search, roleFilter, page],
    queryFn: async () => apiRequest<{ users: User[] }>(`/users?${params.toString()}`)
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "INSTRUCTOR" }
  });

  const refreshUsers = async (msg?: string) => {
    setErrorMsg(null);
    if (msg) setBanner(msg);
    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics", "platform"] });
  };

  const onCreateUser = async (values: CreateUserValues) => {
    setErrorMsg(null);
    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(values)
      });
      reset();
      setShowCreate(false);
      await refreshUsers("User account created.");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to create user");
    }
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiRequest(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      }),
    onSuccess: () => refreshUsers("User role updated."),
    onError: (err) => setErrorMsg(err instanceof ApiError ? err.message : "Failed to update role")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive })
      }),
    onSuccess: () => refreshUsers("User status updated."),
    onError: (err) => setErrorMsg(err instanceof ApiError ? err.message : "Failed to update user")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => refreshUsers("User deleted."),
    onError: (err) => setErrorMsg(err instanceof ApiError ? err.message : "Failed to delete user")
  });

  const users = usersQuery.data?.data.users ?? [];
  const meta = usersQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="nb-heading text-3xl">User & Role Administration</h1>
          <p className="text-sm text-slate-700">
            Create instructor/admin accounts, manage roles, and toggle active status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="nb-btn-primary text-xs"
        >
          <UserPlus className="h-4 w-4" />
          {showCreate ? "Close Form" : "Create User"}
        </button>
      </div>

      {banner && <SuccessBanner message={banner} />}
      {errorMsg && (
        <div
          className="border-2 border-[#111827] bg-red-100 px-4 py-3 text-sm font-bold text-[#111827]"
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleSubmit(onCreateUser)} className="nb-card p-6 space-y-4">
          <h2 className="nb-heading text-base">Create New User</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Name
              </label>
              <input type="text" {...register("name")} className="nb-input mt-1" />
              {errors.name && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Email
              </label>
              <input type="email" {...register("email")} className="nb-input mt-1" />
              {errors.email && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Password
              </label>
              <input type="password" {...register("password")} className="nb-input mt-1" />
              {errors.password && (
                <p className="mt-1 text-xs font-bold text-red-700">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block font-mono text-xs font-bold uppercase text-[#111827]">
                Role
              </label>
              <select {...register("role")} className="nb-input mt-1">
                <option value="STUDENT">STUDENT</option>
                <option value="INSTRUCTOR">INSTRUCTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="nb-btn-primary text-xs">
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </form>
      )}

      <div className="nb-card flex flex-wrap gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#111827]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email..."
            className="nb-input pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="nb-input w-auto"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="INSTRUCTOR">INSTRUCTOR</option>
          <option value="STUDENT">STUDENT</option>
        </select>
      </div>

      {usersQuery.isLoading ? (
        <LoadingState message="Loading users..." />
      ) : usersQuery.isError ? (
        <ErrorState message="Failed to load users" />
      ) : (
        <div className="nb-card p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-[#111827] font-mono text-xs uppercase text-[#111827]">
              <tr>
                <th className="py-2.5 pr-4">Name</th>
                <th className="py-2.5 pr-4">Email</th>
                <th className="py-2.5 pr-4">Role</th>
                <th className="py-2.5 pr-4">Status</th>
                <th className="py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111827]/15">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4 font-bold text-[#111827]">{u.name}</td>
                  <td className="py-3 pr-4 text-slate-700">{u.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      aria-label={`Role for ${u.name}`}
                      value={u.role}
                      onChange={(e) =>
                        roleMutation.mutate({ id: u.id, role: e.target.value as Role })
                      }
                      className="border-2 border-[#111827] bg-white px-2 py-1 font-mono text-xs font-bold"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge value={u.isActive ? "ACTIVE" : "ARCHIVED"} />
                  </td>
                  <td className="py-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })
                      }
                      className="border-2 border-[#111827] bg-white px-2.5 py-1 font-mono text-xs font-bold hover:bg-[#F8CE46]"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${u.name}`}
                      onClick={() => deleteMutation.mutate(u.id)}
                      className="border-2 border-[#111827] bg-red-100 p-1.5 hover:bg-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t-2 border-[#111827]/15 pt-3 font-mono text-xs font-bold text-[#111827]">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} users)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="nb-btn-secondary px-3 py-1 text-xs"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="nb-btn-secondary px-3 py-1 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
