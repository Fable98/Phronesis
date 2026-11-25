"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Upload
} from "lucide-react";
import { ErrorState, LoadingState, StatusBadge, SuccessBanner } from "@/components/UiStates";
import { ApiError, apiRequest, getAuthorizedFileUrl, uploadFileToApi } from "@/lib/api";
import {
  Assignment,
  Course,
  CourseProgress,
  Enrollment,
  Lesson,
  Question,
  Quiz,
  QuizAttempt
} from "@/lib/types";

type ActiveTab = "lessons" | "assignments" | "quizzes" | "materials";

interface QuizResultData {
  attempt: QuizAttempt;
  quiz: { id: string; title: string; passingScore: number };
  breakdown: Array<{
    questionId: string;
    prompt: string;
    points: number;
    selectedOptionId: string | null;
    isCorrect: boolean;
    pointsEarned: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

export default function StudentCourseLearnPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("lessons");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    searchParams.get("lessonId")
  );
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Assignment submission state
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submissionFile, setSubmissionFile] = useState<Record<string, File | null>>({});

  // Quiz taking state
  const [activeAttempt, setActiveAttempt] = useState<{
    attempt: QuizAttempt;
    questions: Question[];
  } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: async () => {
      const res = await apiRequest<{ course: Course; enrollment: Enrollment | null }>(
        `/courses/${params.id}`
      );
      return res.data;
    }
  });

  const progressQuery = useQuery({
    queryKey: ["progress", params.id],
    queryFn: async () => {
      const res = await apiRequest<{
        progress: CourseProgress;
        enrollmentStatus: string;
      }>(`/courses/${params.id}/progress`);
      return res.data;
    }
  });

  const assignmentsQuery = useQuery({
    queryKey: ["course-assignments", params.id],
    queryFn: async () => {
      const res = await apiRequest<{ assignments: Assignment[] }>(
        `/courses/${params.id}/assignments`
      );
      return res.data.assignments;
    }
  });

  const quizzesQuery = useQuery({
    queryKey: ["course-quizzes", params.id],
    queryFn: async () => {
      const res = await apiRequest<{ quizzes: Quiz[] }>(`/courses/${params.id}/quizzes`);
      return res.data.quizzes;
    }
  });

  const orderedLessons = useMemo<Lesson[]>(() => {
    const mods = courseQuery.data?.course.modules ?? [];
    return mods.flatMap((m) => m.lessons);
  }, [courseQuery.data]);

  useEffect(() => {
    if (!selectedLessonId && orderedLessons.length > 0) {
      setSelectedLessonId(orderedLessons[0]!.id);
    }
  }, [orderedLessons, selectedLessonId]);

  const currentLessonIndex = orderedLessons.findIndex((l) => l.id === selectedLessonId);
  const currentLesson = currentLessonIndex >= 0 ? orderedLessons[currentLessonIndex] : orderedLessons[0];

  const lessonDetailQuery = useQuery({
    queryKey: ["lesson", currentLesson?.id],
    enabled: Boolean(currentLesson?.id),
    queryFn: async () => {
      const res = await apiRequest<{ lesson: Lesson; isCompleted: boolean }>(
        `/lessons/${currentLesson!.id}`
      );
      return res.data;
    }
  });

  // Countdown timer for active quiz attempt
  useEffect(() => {
    if (!activeAttempt) {
      setSecondsLeft(null);
      return;
    }
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(activeAttempt.attempt.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    };
    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [activeAttempt]);

  const completeLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return apiRequest<{ progress: CourseProgress; enrollmentStatus: string }>(
        `/lessons/${lessonId}/complete`,
        { method: "POST" }
      );
    },
    onSuccess: async () => {
      setActionError(null);
      setFeedbackBanner("Lesson marked complete!");
      await queryClient.invalidateQueries({ queryKey: ["progress", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["lesson", currentLesson?.id] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "student"] });
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "my"] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Unable to mark lesson complete");
    }
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      let fileId: string | undefined;
      const file = submissionFile[assignmentId];
      if (file) {
        const uploaded = await uploadFileToApi(file);
        fileId = uploaded.id;
      }
      const content = submissionText[assignmentId]?.trim();
      return apiRequest(`/assignments/${assignmentId}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          ...(content ? { content } : {}),
          ...(fileId ? { fileId } : {})
        })
      });
    },
    onSuccess: async (_res, assignmentId) => {
      setActionError(null);
      setFeedbackBanner("Assignment submitted successfully!");
      setSubmissionText((prev) => ({ ...prev, [assignmentId]: "" }));
      setSubmissionFile((prev) => ({ ...prev, [assignmentId]: null }));
      await queryClient.invalidateQueries({ queryKey: ["course-assignments", params.id] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit assignment");
    }
  });

  const startQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      return apiRequest<{ attempt: QuizAttempt; questions: Question[] }>(
        `/quizzes/${quizId}/attempts`,
        { method: "POST" }
      );
    },
    onSuccess: (res) => {
      setActionError(null);
      setQuizResult(null);
      setQuizAnswers({});
      setActiveAttempt(res.data);
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.status === 409 && err.details && typeof err.details === "object") {
        const details = err.details as { attemptId?: string };
        if (details.attemptId) {
          // Resume existing IN_PROGRESS attempt
          const res = await apiRequest<{
            attempt: QuizAttempt;
            quiz: { questions: Question[] };
            savedAnswers: Array<{ questionId: string; selectedOptionId: string }>;
          }>(`/attempts/${details.attemptId}/result`);
          const map: Record<string, string> = {};
          for (const a of res.data.savedAnswers ?? []) {
            map[a.questionId] = a.selectedOptionId;
          }
          setQuizAnswers(map);
          setActiveAttempt({ attempt: res.data.attempt, questions: res.data.quiz.questions });
          setActionError(null);
          return;
        }
      }
      setActionError(err instanceof ApiError ? err.message : "Cannot start quiz");
    }
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      const answers = Object.entries(quizAnswers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId
      }));
      return apiRequest<QuizResultData>(`/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers })
      });
    },
    onSuccess: async (res) => {
      setActionError(null);
      setActiveAttempt(null);
      setQuizResult(res.data);
      await queryClient.invalidateQueries({ queryKey: ["course-quizzes", params.id] });
      await queryClient.invalidateQueries({ queryKey: ["analytics", "student"] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit quiz");
    }
  });

  const viewResultMutation = useMutation({
    mutationFn: async (attemptId: string) => {
      const res = await apiRequest<QuizResultData>(`/attempts/${attemptId}/result`);
      return res.data;
    },
    onSuccess: (data) => {
      setQuizResult(data);
    }
  });

  if (courseQuery.isLoading) return <LoadingState message="Loading course workspace..." />;
  if (courseQuery.isError || !courseQuery.data) {
    return (
      <ErrorState
        message={courseQuery.isError ? (courseQuery.error as Error).message : "Course not found"}
      />
    );
  }

  const course = courseQuery.data.course;
  const completedSet = new Set(progressQuery.data?.progress.completedLessonIds ?? []);
  const pct = progressQuery.data?.progress.percentage ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {course.category}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
          </div>
          <div className="w-full sm:w-56">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Course Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {(
            [
              { id: "lessons", label: "Lessons", icon: Circle },
              { id: "assignments", label: "Assignments", icon: ClipboardList },
              { id: "quizzes", label: "Quizzes", icon: HelpCircle },
              { id: "materials", label: "Materials", icon: FileText }
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setFeedbackBanner(null);
                  setActionError(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === t.id
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {feedbackBanner && <SuccessBanner message={feedbackBanner} />}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {actionError}
        </div>
      )}

      {activeTab === "lessons" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-900">Curriculum</h2>
            <div className="mt-3 space-y-4">
              {(course.modules ?? []).map((mod) => (
                <div key={mod.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {mod.position}. {mod.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {mod.lessons.map((lesson) => {
                      const done = completedSet.has(lesson.id);
                      const active = currentLesson?.id === lesson.id;
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLessonId(lesson.id);
                              setFeedbackBanner(null);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                              active
                                ? "bg-brand-50 text-brand-700"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate flex-1">{lesson.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {!currentLesson ? (
              <p className="text-sm text-slate-500">No published lessons available in this course.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{currentLesson.title}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {currentLesson.durationMinutes} minutes
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={completeLessonMutation.isPending || completedSet.has(currentLesson.id)}
                    onClick={() => completeLessonMutation.mutate(currentLesson.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                      completedSet.has(currentLesson.id)
                        ? "bg-emerald-100 text-emerald-800 cursor-default"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completedSet.has(currentLesson.id)
                      ? "Completed"
                      : completeLessonMutation.isPending
                        ? "Saving..."
                        : "Mark Complete"}
                  </button>
                </div>

                {currentLesson.videoUrl && (
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                    <iframe
                      src={currentLesson.videoUrl}
                      title={currentLesson.title}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {lessonDetailQuery.data?.lesson.content ?? currentLesson.content}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={currentLessonIndex <= 0}
                    onClick={() => setSelectedLessonId(orderedLessons[currentLessonIndex - 1]!.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Lesson
                  </button>
                  <button
                    type="button"
                    disabled={currentLessonIndex >= orderedLessons.length - 1}
                    onClick={() => setSelectedLessonId(orderedLessons[currentLessonIndex + 1]!.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next Lesson
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-4">
          {(assignmentsQuery.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No published assignments for this course.
            </div>
          ) : (
            (assignmentsQuery.data ?? []).map((assignment) => {
              const latestSub = assignment.submissions?.[0];
              const usedAttempts = assignment.submissions?.length ?? 0;
              const maxAllowed = assignment.allowResubmission ? 1 + assignment.maxResubmissions : 1;
              const canSubmit = usedAttempts < maxAllowed;

              return (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{assignment.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{assignment.description}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-800">Max Score: {assignment.maxScore}</p>
                      {assignment.dueDate && (
                        <p>Due: {new Date(assignment.dueDate).toLocaleString()}</p>
                      )}
                      <p>
                        Attempts: {usedAttempts}/{maxAllowed}
                      </p>
                    </div>
                  </div>

                  {latestSub && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          Latest Submission (Attempt #{latestSub.attemptNumber})
                        </span>
                        <div className="flex items-center gap-2">
                          {latestSub.isLate && <StatusBadge value="EXPIRED" />}
                          <StatusBadge value={latestSub.status} />
                        </div>
                      </div>
                      {latestSub.content && (
                        <p className="mt-2 text-slate-700">{latestSub.content}</p>
                      )}
                      {latestSub.file && (
                        <a
                          href={getAuthorizedFileUrl(latestSub.file.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {latestSub.file.originalName}
                        </a>
                      )}
                      {latestSub.status === "GRADED" && (
                        <div className="mt-3 border-t border-slate-200 pt-2 text-xs">
                          <p className="font-bold text-emerald-700">
                            Score: {latestSub.score} / {assignment.maxScore}
                          </p>
                          {latestSub.feedback && (
                            <p className="mt-1 text-slate-600">Feedback: {latestSub.feedback}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {canSubmit && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <textarea
                        rows={3}
                        placeholder="Write your assignment response..."
                        value={submissionText[assignment.id] ?? ""}
                        onChange={(e) =>
                          setSubmissionText((prev) => ({
                            ...prev,
                            [assignment.id]: e.target.value
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                          <Upload className="h-3.5 w-3.5" />
                          <span>
                            {submissionFile[assignment.id]?.name ?? "Attach PDF/PNG/JPEG (optional)"}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={(e) =>
                              setSubmissionFile((prev) => ({
                                ...prev,
                                [assignment.id]: e.target.files?.[0] ?? null
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          disabled={submitAssignmentMutation.isPending}
                          onClick={() => submitAssignmentMutation.mutate(assignment.id)}
                          className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                          {submitAssignmentMutation.isPending
                            ? "Submitting..."
                            : usedAttempts > 0
                              ? "Resubmit Assignment"
                              : "Submit Assignment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "quizzes" && (
        <div className="space-y-6">
          {activeAttempt ? (
            <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Quiz in Progress</h2>
                  <p className="text-xs text-slate-500">
                    Select one option per question and submit before the timer expires.
                  </p>
                </div>
                {secondsLeft !== null && (
                  <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                    Time Remaining: {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, "0")}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {activeAttempt.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {idx + 1}. {q.prompt}{" "}
                      <span className="text-xs font-normal text-slate-500">({q.points} pts)</span>
                    </p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt.id}
                            checked={quizAnswers[q.id] === opt.id}
                            onChange={() =>
                              setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                            }
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={submitQuizMutation.isPending}
                onClick={() => submitQuizMutation.mutate(activeAttempt.attempt.id)}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {submitQuizMutation.isPending ? "Grading..." : "Submit Quiz"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(quizzesQuery.data ?? []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No quizzes published in this course yet.
                </div>
              ) : (
                (quizzesQuery.data ?? []).map((quiz) => (
                  <div
                    key={quiz.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{quiz.title}</h2>
                        {quiz.description && (
                          <p className="mt-1 text-sm text-slate-600">{quiz.description}</p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {quiz._count?.questions ?? 0} questions · {quiz.timeLimitMinutes} min · Passing
                          score: {quiz.passingScore} · Max attempts: {quiz.maxAttempts}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={startQuizMutation.isPending}
                        onClick={() => startQuizMutation.mutate(quiz.id)}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        Start / Resume Quiz
                      </button>
                    </div>

                    {quiz.attempts && quiz.attempts.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Your Attempts
                        </p>
                        <ul className="mt-2 space-y-2">
                          {quiz.attempts.map((att) => (
                            <li
                              key={att.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <StatusBadge value={att.status} />
                                {att.status !== "IN_PROGRESS" && (
                                  <span className="font-semibold text-slate-800">
                                    Score: {att.score ?? 0}/{att.scoreMax} (
                                    {att.passed ? "Passed" : "Did not pass"})
                                  </span>
                                )}
                              </div>
                              {att.status !== "IN_PROGRESS" && (
                                <button
                                  type="button"
                                  onClick={() => viewResultMutation.mutate(att.id)}
                                  className="font-semibold text-brand-600 hover:underline"
                                >
                                  View Breakdown
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {quizResult && (
            <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Result: {quizResult.quiz.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Score: <strong>{quizResult.attempt.score}</strong> /{" "}
                    {quizResult.attempt.scoreMax} ·{" "}
                    <span
                      className={
                        quizResult.attempt.passed
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-red-700"
                      }
                    >
                      {quizResult.attempt.passed ? "PASSED" : "FAILED"}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizResult(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {quizResult.breakdown.map((b, i) => (
                  <div key={b.questionId} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {i + 1}. {b.prompt}{" "}
                      <span
                        className={`ml-2 text-xs ${
                          b.isCorrect ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        ({b.pointsEarned}/{b.points} pts)
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {b.options.map((o) => {
                        const selected = o.id === b.selectedOptionId;
                        return (
                          <li
                            key={o.id}
                            className={`rounded px-2 py-1 ${
                              o.isCorrect
                                ? "bg-emerald-50 font-semibold text-emerald-800"
                                : selected
                                  ? "bg-red-50 text-red-700"
                                  : "text-slate-600"
                            }`}
                          >
                            {o.text} {selected ? "(Your choice)" : ""}{" "}
                            {o.isCorrect ? "✓ Correct" : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "materials" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Course Materials</h2>
          {!course.materials || course.materials.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No downloadable materials attached yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {course.materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-500">{m.file.originalName}</p>
                  </div>
                  <a
                    href={getAuthorizedFileUrl(m.file.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Open File
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
