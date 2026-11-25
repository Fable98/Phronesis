"use client";

import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14 text-slate-500"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      <p className="mt-3 text-sm font-medium">{message}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center"
      role="alert"
    >
      <AlertCircle className="h-7 w-7 text-red-600" />
      <p className="mt-2 text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-slate-400" />
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
      role="status"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  GRADED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  PENDING: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-slate-200 text-slate-700",
  DROPPED: "bg-slate-200 text-slate-700",
  BEGINNER: "bg-teal-100 text-teal-800",
  INTERMEDIATE: "bg-indigo-100 text-indigo-800",
  ADVANCED: "bg-purple-100 text-purple-800",
  ADMIN: "bg-rose-100 text-rose-800",
  INSTRUCTOR: "bg-indigo-100 text-indigo-800",
  STUDENT: "bg-sky-100 text-sky-800"
};

export function StatusBadge({ value }: { value: string }) {
  const style = BADGE_STYLES[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {value.replace("_", " ")}
    </span>
  );
}
