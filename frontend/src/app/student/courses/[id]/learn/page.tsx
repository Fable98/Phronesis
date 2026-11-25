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

  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submissionFile, setSubmissionFile] = useState<Record<string, File | null>>({});

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
  const currentLesson =
    currentLessonIndex >= 0 ? orderedLessons[currentLessonIndex] : orderedLessons[0];

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
    mutationFn: async (lessonId: string) =>
      apiRequest<{ progress: CourseProgress; enrollmentStatus: string }>(
        `/lessons/${lessonId}/complete`,
        { method: "POST" }
      ),
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
    mutationFn: async (quizId: string) =>
      apiRequest<{ attempt: QuizAttempt; questions: Question[] }>(
        `/quizzes/${quizId}/attempts`,
        { method: "POST" }
      ),
    onSuccess: (res) => {
      setActionError(null);
      setQuizResult(null);
      setQuizAnswers({});
      setActiveAttempt(res.data);
    },
    onError: async (err) => {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.details &&
        typeof err.details === "object"
      ) {
        const details = err.details as { attemptId?: string };
        if (details.attemptId) {
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
      <div className="nb-card-mustard p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="border-2 border-[#111827] bg-white px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#111827]">
              {course.category}
            </span>
            <h1 className="mt-2 nb-heading text-2xl">{course.title}</h1>
          </div>
          <div className="w-full sm:w-56 border-2 border-[#111827] bg-white p-3">
            <div className="flex justify-between font-mono text-xs font-bold text-[#111827]">
              <span>Course Progress</span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1.5 h-3 w-full border-2 border-[#111827] bg-[#F5F3EC]">
              <div
                className="h-full bg-[#A9D8B8] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-[#111827] pt-4">
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
                className={`inline-flex items-center gap-1.5 border-2 border-[#111827] px-3.5 py-2 font-mono text-xs font-bold transition ${
                  activeTab === t.id
                    ? "bg-[#111827] text-white"
                    : "bg-white text-[#111827] hover:bg-[#F5F3EC]"
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
        <div
          className="border-2 border-[#111827] bg-red-100 px-4 py-3 text-sm font-bold text-[#111827]"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {activeTab === "lessons" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 nb-card p-4 h-fit">
            <h2 className="nb-heading text-sm">Curriculum</h2>
            <div className="mt-3 space-y-4">
              {(course.modules ?? []).map((mod) => (
                <div key={mod.id}>
                  <p className="font-mono text-xs font-bold uppercase text-slate-700">
                    {mod.position}. {mod.title}
                  </p>
                  <ul className="mt-2 space-y-1.5">
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
                            className={`flex w-full items-center gap-2 border-2 px-2.5 py-2 text-left text-xs font-bold transition ${
                              active
                                ? "border-[#111827] bg-[#111827] text-white"
                                : "border-[#111827]/20 bg-[#F5F3EC] text-[#111827] hover:border-[#111827]"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2
                                className={`h-4 w-4 shrink-0 ${
                                  active ? "text-[#A9D8B8]" : "text-emerald-700"
                                }`}
                              />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 opacity-60" />
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

          <div className="lg:col-span-8 nb-card p-6">
            {!currentLesson ? (
              <p className="text-sm text-slate-600">No published lessons available in this course.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#111827] pb-4">
                  <div>
                    <h2 className="nb-heading text-xl">{currentLesson.title}</h2>
                    <p className="mt-1 flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                      <Clock className="h-3.5 w-3.5" />
                      {currentLesson.durationMinutes} minutes
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={completeLessonMutation.isPending || completedSet.has(currentLesson.id)}
                    onClick={() => completeLessonMutation.mutate(currentLesson.id)}
                    className={`inline-flex items-center gap-1.5 border-2 border-[#111827] px-4 py-2 font-mono text-xs font-bold shadow-[3px_3px_0px_#111827] transition ${
                      completedSet.has(currentLesson.id)
                        ? "bg-[#A9D8B8] text-[#111827] cursor-default"
                        : "bg-[#111827] text-white hover:-translate-x-0.5 hover:-translate-y-0.5"
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
                  <div className="aspect-video w-full overflow-hidden border-2 border-[#111827] bg-slate-900">
                    <iframe
                      src={currentLesson.videoUrl}
                      title={currentLesson.title}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                )}

                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">
                  {lessonDetailQuery.data?.lesson.content ?? currentLesson.content}
                </div>

                <div className="flex items-center justify-between border-t-2 border-[#111827]/20 pt-4">
                  <button
                    type="button"
                    disabled={currentLessonIndex <= 0}
                    onClick={() => setSelectedLessonId(orderedLessons[currentLessonIndex - 1]!.id)}
                    className="nb-btn-secondary text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Lesson
                  </button>
                  <button
                    type="button"
                    disabled={currentLessonIndex >= orderedLessons.length - 1}
                    onClick={() => setSelectedLessonId(orderedLessons[currentLessonIndex + 1]!.id)}
                    className="nb-btn-secondary text-xs"
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
            <div className="nb-card p-8 text-center text-sm text-slate-600">
              No published assignments for this course.
            </div>
          ) : (
            (assignmentsQuery.data ?? []).map((assignment) => {
              const latestSub = assignment.submissions?.[0];
              const usedAttempts = assignment.submissions?.length ?? 0;
              const maxAllowed = assignment.allowResubmission ? 1 + assignment.maxResubmissions : 1;
              const canSubmit = usedAttempts < maxAllowed;

              return (
                <div key={assignment.id} className="nb-card p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="nb-heading text-lg">{assignment.title}</h2>
                      <p className="mt-1 text-sm text-slate-700">{assignment.description}</p>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-[#111827]">
                      <p>Max Score: {assignment.maxScore}</p>
                      {assignment.dueDate && (
                        <p>Due: {new Date(assignment.dueDate).toLocaleString()}</p>
                      )}
                      <p>
                        Attempts: {usedAttempts}/{maxAllowed}
                      </p>
                    </div>
                  </div>

                  {latestSub && (
                    <div className="border-2 border-[#111827] bg-[#F5F3EC] p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[#111827]">
                          Latest Submission (Attempt #{latestSub.attemptNumber})
                        </span>
                        <div className="flex items-center gap-2">
                          {latestSub.isLate && <StatusBadge value="EXPIRED" />}
                          <StatusBadge value={latestSub.status} />
                        </div>
                      </div>
                      {latestSub.content && (
                        <p className="mt-2 text-[#111827]">{latestSub.content}</p>
                      )}
                      {latestSub.file && (
                        <a
                          href={getAuthorizedFileUrl(latestSub.file.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-bold text-[#111827] underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {latestSub.file.originalName}
                        </a>
                      )}
                      {latestSub.status === "GRADED" && (
                        <div className="mt-3 border-t-2 border-[#111827]/20 pt-2 text-xs">
                          <p className="font-mono font-bold text-[#111827]">
                            Score: {latestSub.score} / {assignment.maxScore}
                          </p>
                          {latestSub.feedback && (
                            <p className="mt-1 text-slate-700">Feedback: {latestSub.feedback}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {canSubmit && (
                    <div className="space-y-3 border-t-2 border-[#111827]/15 pt-4">
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
                        className="nb-input"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="nb-btn-secondary cursor-pointer text-xs">
                          <Upload className="h-3.5 w-3.5" />
                          <span>
                            {submissionFile[assignment.id]?.name ??
                              "Attach PDF/PNG/JPEG (optional)"}
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
                          className="nb-btn-primary text-xs"
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
            <div className="nb-card p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#111827] pb-4">
                <div>
                  <h2 className="nb-heading text-lg">Quiz in Progress</h2>
                  <p className="text-xs text-slate-700">
                    Select one option per question and submit before the timer expires.
                  </p>
                </div>
                {secondsLeft !== null && (
                  <span className="border-2 border-[#111827] bg-[#F8CE46] px-3 py-1.5 font-mono text-xs font-bold text-[#111827]">
                    Time Remaining: {Math.floor(secondsLeft / 60)}:
                    {String(secondsLeft % 60).padStart(2, "0")}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                {activeAttempt.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    data-testid="quiz-question"
                    className="border-2 border-[#111827] bg-[#F5F3EC] p-4"
                  >
                    <p className="font-mono text-sm font-bold text-[#111827]">
                      {idx + 1}. {q.prompt}{" "}
                      <span className="text-xs font-normal text-slate-700">({q.points} pts)</span>
                    </p>
                    <div className="mt-3 space-y-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-2.5 border-2 border-[#111827] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F8CE46]/40"
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
                className="nb-btn-primary"
              >
                {submitQuizMutation.isPending ? "Grading..." : "Submit Quiz"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(quizzesQuery.data ?? []).length === 0 ? (
                <div className="nb-card p-8 text-center text-sm text-slate-600">
                  No quizzes published in this course yet.
                </div>
              ) : (
                (quizzesQuery.data ?? []).map((quiz) => (
                  <div key={quiz.id} className="nb-card p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="nb-heading text-lg">{quiz.title}</h2>
                        {quiz.description && (
                          <p className="mt-1 text-sm text-slate-700">{quiz.description}</p>
                        )}
                        <p className="mt-2 font-mono text-xs font-bold text-slate-700">
                          {quiz._count?.questions ?? 0} questions · {quiz.timeLimitMinutes} min ·
                          Passing score: {quiz.passingScore} · Max attempts: {quiz.maxAttempts}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={startQuizMutation.isPending}
                        onClick={() => startQuizMutation.mutate(quiz.id)}
                        className="nb-btn-primary text-xs"
                      >
                        Start / Resume Quiz
                      </button>
                    </div>

                    {quiz.attempts && quiz.attempts.length > 0 && (
                      <div className="border-t-2 border-[#111827]/15 pt-3">
                        <p className="font-mono text-xs font-bold uppercase text-[#111827]">
                          Your Attempts
                        </p>
                        <ul className="mt-2 space-y-2">
                          {quiz.attempts.map((att) => (
                            <li
                              key={att.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-2 border-[#111827] bg-[#F5F3EC] px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <StatusBadge value={att.status} />
                                {att.status !== "IN_PROGRESS" && (
                                  <span className="font-mono font-bold text-[#111827]">
                                    Score: {att.score ?? 0}/{att.scoreMax} (
                                    {att.passed ? "Passed" : "Did not pass"})
                                  </span>
                                )}
                              </div>
                              {att.status !== "IN_PROGRESS" && (
                                <button
                                  type="button"
                                  onClick={() => viewResultMutation.mutate(att.id)}
                                  className="font-mono font-bold text-[#111827] underline"
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
            <div className="nb-card-lilac p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#111827] pb-3">
                <div>
                  <h3 className="nb-heading text-lg">Result: {quizResult.quiz.title}</h3>
                  <p className="font-mono text-sm font-bold text-[#111827]">
                    Score: {quizResult.attempt.score} / {quizResult.attempt.scoreMax} ·{" "}
                    {quizResult.attempt.passed ? "PASSED" : "FAILED"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizResult(null)}
                  className="nb-btn-secondary px-3 py-1 text-xs"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {quizResult.breakdown.map((b, i) => (
                  <div
                    key={b.questionId}
                    className="border-2 border-[#111827] bg-white p-3 text-sm"
                  >
                    <p className="font-mono font-bold text-[#111827]">
                      {i + 1}. {b.prompt}{" "}
                      <span className="ml-2 text-xs">
                        ({b.pointsEarned}/{b.points} pts)
                      </span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {b.options.map((o) => {
                        const selected = o.id === b.selectedOptionId;
                        return (
                          <li
                            key={o.id}
                            className={`border px-2 py-1 ${
                              o.isCorrect
                                ? "border-[#111827] bg-[#A9D8B8] font-bold"
                                : selected
                                  ? "border-[#111827] bg-red-200"
                                  : "border-transparent text-slate-700"
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
        <div className="nb-card p-6">
          <h2 className="nb-heading text-lg">Course Materials</h2>
          {!course.materials || course.materials.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No downloadable materials attached yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {course.materials.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-2 border-[#111827] bg-[#F5F3EC] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-[#111827]">{m.title}</p>
                    <p className="font-mono text-xs text-slate-600">{m.file.originalName}</p>
                  </div>
                  <a
                    href={getAuthorizedFileUrl(m.file.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="nb-btn-secondary text-xs"
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
