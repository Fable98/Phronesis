"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, StatusBadge, SuccessBanner } from "@/components/UiStates";
import { ApiError, apiRequest, getAuthorizedFileUrl } from "@/lib/api";
import { Submission } from "@/lib/types";

export default function InstructorSubmissionsPage() {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["instructor", "submissions"],
    queryFn: async () => {
      const res = await apiRequest<{ submissions: Submission[] }>("/submissions/instructor");
      return res.data.submissions;
    }
  });

  const gradeMutation = useMutation({
    mutationFn: async (sub: Submission) => {
      const rawScore = scores[sub.id] ?? (sub.score !== null ? String(sub.score) : "");
      const numScore = Number(rawScore);
      if (Number.isNaN(numScore)) {
        throw new Error("Enter a valid numeric score");
      }
      const feedback = feedbacks[sub.id] ?? sub.feedback ?? "";
      return apiRequest(`/submissions/${sub.id}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ score: numScore, feedback })
      });
    },
    onSuccess: async () => {
      setErrorMsg(null);
      setBanner("Submission graded successfully!");
      await queryClient.invalidateQueries({ queryKey: ["instructor", "submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "instructor"] });
    },
    onError: (err) => {
      setErrorMsg(err instanceof ApiError || err instanceof Error ? err.message : "Failed to grade");
    }
  });

  if (isLoading) return <LoadingState message="Loading student submissions..." />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const submissions = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grade Submissions</h1>
        <p className="text-sm text-slate-600">
          Review student work and record scores and feedback for your courses.
        </p>
      </div>

      {banner && <SuccessBanner message={banner} />}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errorMsg}
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Student assignment submissions for your courses will appear here."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const maxScore = sub.assignment?.maxScore ?? 100;
            return (
              <div
                key={sub.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={sub.status} />
                      {sub.isLate && <StatusBadge value="EXPIRED" />}
                      <span className="text-xs text-slate-500">
                        Attempt #{sub.attemptNumber} · {new Date(sub.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-900">
                      {sub.assignment?.course?.title} — {sub.assignment?.title}
                    </h2>
                    <p className="text-xs text-slate-600">
                      Student: <strong>{sub.student?.name}</strong> ({sub.student?.email})
                    </p>
                  </div>
                </div>

                {sub.content && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {sub.content}
                  </div>
                )}

                {sub.file && (
                  <a
                    href={getAuthorizedFileUrl(sub.file.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Attached File ({sub.file.originalName})
                  </a>
                )}

                <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-700">
                      Score (0–{maxScore})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={maxScore}
                      value={scores[sub.id] ?? (sub.score !== null ? String(sub.score) : "")}
                      onChange={(e) =>
                        setScores((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-medium text-slate-700">
                      Feedback
                    </label>
                    <input
                      type="text"
                      value={feedbacks[sub.id] ?? sub.feedback ?? ""}
                      onChange={(e) =>
                        setFeedbacks((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      placeholder="Constructive feedback..."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="button"
                      disabled={gradeMutation.isPending}
                      onClick={() => gradeMutation.mutate(sub)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {sub.status === "GRADED" ? "Update Grade" : "Save Grade"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
