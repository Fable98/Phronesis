"use client";

import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="nb-card flex flex-col items-center justify-center py-14 text-[#111827]"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 animate-spin text-[#111827]" />
      <p className="mt-3 font-mono text-sm font-bold">{message}</p>
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
      className="border-2 border-[#111827] bg-red-100 px-6 py-12 text-center shadow-[4px_4px_0px_#111827]"
      role="alert"
    >
      <AlertCircle className="mx-auto h-7 w-7 text-red-700" />
      <p className="mt-2 text-sm font-bold text-[#111827]">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="nb-btn-primary mt-4 text-xs">
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
    <div className="border-2 border-dashed border-[#111827] bg-white px-6 py-12 text-center">
      <Inbox className="mx-auto h-8 w-8 text-[#111827]" />
      <h3 className="mt-3 font-mono text-base font-bold text-[#111827]">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-700">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 border-2 border-[#111827] bg-[#A9D8B8] px-4 py-3 text-sm font-bold text-[#111827] shadow-[3px_3px_0px_#111827]"
      role="status"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#111827]" />
      <span>{message}</span>
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  PUBLISHED: "bg-[#A9D8B8] text-[#111827]",
  COMPLETED: "bg-[#A9D8B8] text-[#111827]",
  GRADED: "bg-[#A9D8B8] text-[#111827]",
  ACTIVE: "bg-[#F8CE46] text-[#111827]",
  PENDING: "bg-[#F8CE46] text-[#111827]",
  SUBMITTED: "bg-[#F0B7F3] text-[#111827]",
  IN_PROGRESS: "bg-[#F8CE46] text-[#111827]",
  DRAFT: "bg-white text-[#111827]",
  REJECTED: "bg-red-200 text-[#111827]",
  EXPIRED: "bg-red-200 text-[#111827]",
  ARCHIVED: "bg-slate-200 text-[#111827]",
  DROPPED: "bg-slate-200 text-[#111827]",
  BEGINNER: "bg-[#A9D8B8] text-[#111827]",
  INTERMEDIATE: "bg-[#F8CE46] text-[#111827]",
  ADVANCED: "bg-[#F0B7F3] text-[#111827]",
  ADMIN: "bg-[#F0B7F3] text-[#111827]",
  INSTRUCTOR: "bg-[#F8CE46] text-[#111827]",
  STUDENT: "bg-[#A9D8B8] text-[#111827]"
};

export function StatusBadge({ value }: { value: string }) {
  const style = BADGE_STYLES[value] ?? "bg-white text-[#111827]";
  return (
    <span
      className={`inline-flex items-center border-2 border-[#111827] px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${style}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}
