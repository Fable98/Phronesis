"use client";

import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/UiStates";
import { apiRequest } from "@/lib/api";
import { QuizAttempt, Submission } from "@/lib/types";

export default function StudentGradesPage() {
  const submissionsQuery = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: async () => {
      const res = await apiRequest<{ submissions: Submission[] }>("/submissions/my");
      return res.data.submissions;
    }
  });

  const attemptsQuery = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: async () => {
      const res = await apiRequest<{ attempts: QuizAttempt[] }>("/attempts/my");
      return res.data.attempts;
    }
  });

  if (submissionsQuery.isLoading || attemptsQuery.isLoading) {
    return <LoadingState message="Loading your grades and quiz attempts..." />;
  }
  if (submissionsQuery.isError || attemptsQuery.isError) {
    return <ErrorState message="Unable to load grades." />;
  }

  const submissions = submissionsQuery.data ?? [];
  const attempts = attemptsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grades & Quiz History</h1>
        <p className="text-sm text-slate-600">
          Review instructor feedback on assignments and your graded quiz attempts.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Assignment Submissions</h2>
        {submissions.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No assignment submissions yet"
              description="Submit assignments from within any enrolled course player."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Course</th>
                  <th className="py-2.5 pr-4">Assignment</th>
                  <th className="py-2.5 pr-4">Attempt</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Score</th>
                  <th className="py-2.5">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {s.assignment?.course?.title ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{s.assignment?.title ?? "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      #{s.attemptNumber} {s.isLate ? "(Late)" : ""}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={s.status} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      {s.score !== null ? `${s.score} / ${s.assignment?.maxScore ?? 100}` : "Pending"}
                    </td>
                    <td className="py-3 text-slate-600">{s.feedback ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Quiz Attempts</h2>
        {attempts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No quiz attempts yet"
              description="Open a course to take its published quizzes."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2.5 pr-4">Course</th>
                  <th className="py-2.5 pr-4">Quiz</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Score</th>
                  <th className="py-2.5">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {a.quiz?.course?.title ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{a.quiz?.title ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={a.status} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      {a.score !== null ? `${a.score} / ${a.scoreMax}` : "—"}
                    </td>
                    <td className="py-3">
                      {a.passed === null ? (
                        "—"
                      ) : a.passed ? (
                        <span className="font-semibold text-emerald-700">Passed</span>
                      ) : (
                        <span className="font-semibold text-red-700">Not Passed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
