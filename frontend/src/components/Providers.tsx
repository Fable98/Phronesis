"use client";

import React, { createContext, useContext, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setCachedCsrfToken } from "@/lib/api";
import { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; bio?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthStateProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const { data } = await apiRequest<{ user: User; csrfToken: string }>("/auth/me");
        setCachedCsrfToken(data.csrfToken);
        return data.user;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false
  });

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await apiRequest<{ user: User; csrfToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setCachedCsrfToken(data.csrfToken);
    queryClient.setQueryData(["auth", "me"], data.user);
    return data.user;
  };

  const register = async (input: {
    name: string;
    email: string;
    password: string;
    bio?: string;
  }): Promise<User> => {
    const { data } = await apiRequest<{ user: User; csrfToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
    setCachedCsrfToken(data.csrfToken);
    queryClient.setQueryData(["auth", "me"], data.user);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      const { data } = await apiRequest<{ csrfToken: string }>("/auth/logout", {
        method: "POST"
      });
      setCachedCsrfToken(data.csrfToken);
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    }
  };

  const refreshUser = async (): Promise<void> => {
    await refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthStateProvider>{children}</AuthStateProvider>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside Providers");
  }
  return ctx;
}
