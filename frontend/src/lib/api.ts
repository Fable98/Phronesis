import { PaginationMeta, StoredFileMeta } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

let cachedCsrfToken: string | null = null;

export function setCachedCsrfToken(token: string | null) {
  cachedCsrfToken = token;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }
  const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include"
  });
  const json = await res.json();
  if (!res.ok || !json?.success || !json?.data?.csrfToken) {
    throw new ApiError(res.status, "CSRF_ERROR", "Unable to obtain CSRF token");
  }
  cachedCsrfToken = json.data.csrfToken as string;
  return cachedCsrfToken;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const method = (options.method ?? "GET").toUpperCase();
  const isMutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isMutating) {
    const csrf = await ensureCsrfToken();
    headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include"
  });

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !json?.success) {
    const code = json?.error?.code ?? "REQUEST_FAILED";
    const message = json?.error?.message ?? `Request failed with status ${res.status}`;
    if (res.status === 403 && code === "FORBIDDEN") {
      // Clear stale CSRF token so next mutation refreshes it
      cachedCsrfToken = null;
    }
    throw new ApiError(res.status, code, message, json?.error?.details);
  }

  const dataWithCsrf = json.data as unknown as { csrfToken?: string };
  if (typeof dataWithCsrf?.csrfToken === "string") {
    cachedCsrfToken = dataWithCsrf.csrfToken;
  }

  return { data: json.data, meta: json.meta };
}

export async function uploadFileToApi(file: File): Promise<StoredFileMeta> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiRequest<{ file: StoredFileMeta }>("/files", {
    method: "POST",
    body: formData
  });
  return data.file;
}

export function getAuthorizedFileUrl(fileId: string): string {
  return `${API_BASE_URL}/files/${fileId}`;
}
