"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardList,
  FileText,
  HelpCircle,
  Plus,
  Send,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { ErrorState, LoadingState, StatusBadge, SuccessBanner } from "@/components/UiStates";
import { ApiError, apiRequest, getAuthorizedFileUrl, uploadFileToApi } from "@/lib/api";
import { Assignment, Course, DifficultyLevel, Quiz } from "@/lib/types";

type EditorTab = "curriculum" | "materials" | "assignments" | "quizzes" | "students" | "settings";

interface EnrolledStudentRow {
  enrollmentId: string;
  student: { id: string; name: string; email: string };
  status: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string;
}

export default function InstructorCourseEditorPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<EditorTab>("curriculum");
  const [banner, setBanner] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Module / Lesson forms
  const [newModTitle, setNewModTitle] = useState("");
  const [lessonForm, setLessonForm] = useState<{
    moduleId: string;
    title: string;
    content: string;
    videoUrl: string;
    durationMinutes: number;
  } | null>(null);

  // Material form
  const [matTitle, setMatTitle] = useState("");
  const [matFile, setMatFile] = useState<File | null>(null);

  // Assignment form
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignMaxScore, setAssignMaxScore] = useState(100);
  const [assignAllowResub, setAssignAllowResub] = useState(true);
  const [assignMaxResub, setAssignMaxResub] = useState(2);
  const [assignAllowLate, setAssignAllowLate] = useState(true);

  // Quiz & Question form
  const [quizTitle, setQuizTitle] = useState("");
  const [quizLimit, setQuizLimit] = useState(20);
  const [quizPass, setQuizPass] = useState(1);
  const [questionPrompt, setQuestionPrompt] = useState<Record<string, string>>({});
  const [opt1, setOpt1] = useState<Record<string, string>>({});
  const [opt2, setOpt2] = useState<Record<string, string>>({});
  const [correctIdx, setCorrectIdx] = useState<Record<string, number>>({});

  // Settings form
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDiff, setEditDiff] = useState<DifficultyLevel>("BEGINNER");

  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: async () => {
      const res = await apiRequest<{ course: Course }>(`/courses/${params.id}`);
      const c = res.data.course;
      setEditTitle((prev) => prev || c.title);
      setEditDesc((prev) => prev || c.description);
      setEditCategory((prev) => prev || c.category);
      setEditDiff(c.difficultyLevel);
      return c;
    }
  });

  const assignmentsQuery = useQuery({
    queryKey: ["course-assignments", params.id],
    enabled: tab === "assignments",
    queryFn: async () => {
      const res = await apiRequest<{ assignments: Assignment[] }>(
        `/courses/${params.id}/assignments`
      );
      return res.data.assignments;
    }
  });

  const quizzesQuery = useQuery({
    queryKey: ["course-quizzes", params.id],
    enabled: tab === "quizzes",
    queryFn: async () => {
      const res = await apiRequest<{ quizzes: Quiz[] }>(`/courses/${params.id}/quizzes`);
      return res.data.quizzes;
    }
  });

  const studentsQuery = useQuery({
    queryKey: ["course-students", params.id],
    enabled: tab === "students",
    queryFn: async () => {
      const res = await apiRequest<{ students: EnrolledStudentRow[] }>(
        `/courses/${params.id}/students`
      );
      return res.data.students;
    }
  });

  const refreshCourse = async (msg?: string) => {
    setErrorMsg(null);
    if (msg) setBanner(msg);
    await queryClient.invalidateQueries({ queryKey: ["course", params.id] });
    await queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
  };

  const handleErr = (err: unknown) => {
    setErrorMsg(err instanceof ApiError || err instanceof Error ? err.message : "Action failed");
  };

  const submitForReviewMutation = useMutation({
    mutationFn: () => apiRequest(`/courses/${params.id}/submit`, { method: "POST" }),
    onSuccess: () => refreshCourse("Course submitted for admin approval!"),
    onError: handleErr
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiRequest(`/courses/${params.id}/archive`, { method: "POST" }),
    onSuccess: () => refreshCourse("Course archived."),
    onError: handleErr
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/courses/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          category: editCategory,
          difficultyLevel: editDiff
        })
      }),
    onSuccess: () => refreshCourse("Course details updated."),
    onError: handleErr
  });

  const addModuleMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/courses/${params.id}/modules`, {
        method: "POST",
        body: JSON.stringify({ title: newModTitle })
      }),
    onSuccess: async () => {
      setNewModTitle("");
      await refreshCourse("Module added.");
    },
    onError: handleErr
  });

  const reorderModulesMutation = useMutation({
    mutationFn: (moduleIds: string[]) =>
      apiRequest(`/courses/${params.id}/modules/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ moduleIds })
      }),
    onSuccess: () => refreshCourse("Modules reordered."),
    onError: handleErr
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) => apiRequest(`/modules/${moduleId}`, { method: "DELETE" }),
    onSuccess: () => refreshCourse("Module removed."),
    onError: handleErr
  });

  const addLessonMutation = useMutation({
    mutationFn: () => {
      if (!lessonForm) throw new Error("Missing lesson form");
      return apiRequest(`/modules/${lessonForm.moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: lessonForm.title,
          content: lessonForm.content,
          videoUrl: lessonForm.videoUrl.trim() || null,
          durationMinutes: lessonForm.durationMinutes,
          isPublished: true
        })
      });
    },
    onSuccess: async () => {
      setLessonForm(null);
      await refreshCourse("Lesson created.");
    },
    onError: handleErr
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: ({ moduleId, lessonIds }: { moduleId: string; lessonIds: string[] }) =>
      apiRequest(`/modules/${moduleId}/lessons/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ lessonIds })
      }),
    onSuccess: () => refreshCourse("Lessons reordered."),
    onError: handleErr
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => apiRequest(`/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: () => refreshCourse("Lesson removed."),
    onError: handleErr
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async () => {
      if (!matFile) throw new Error("Choose a PDF, PNG, or JPEG file");
      const uploaded = await uploadFileToApi(matFile);
      return apiRequest(`/courses/${params.id}/materials`, {
        method: "POST",
        body: JSON.stringify({ title: matTitle.trim() || uploaded.originalName, fileId: uploaded.id })
      });
    },
    onSuccess: async () => {
      setMatTitle("");
      setMatFile(null);
      await refreshCourse("Material uploaded and attached.");
    },
    onError: handleErr
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) =>
      apiRequest(`/courses/${params.id}/materials/${materialId}`, { method: "DELETE" }),
    onSuccess: () => refreshCourse("Material removed."),
    onError: handleErr
  });

  const createAssignmentMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/courses/${params.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title: assignTitle,
          description: assignDesc,
          maxScore: assignMaxScore,
          allowResubmission: assignAllowResub,
          maxResubmissions: assignMaxResub,
          allowLateSubmission: assignAllowLate,
          isPublished: true
        })
      }),
    onSuccess: async () => {
      setAssignTitle("");
      setAssignDesc("");
      setBanner("Assignment created.");
      setErrorMsg(null);
      await queryClient.invalidateQueries({ queryKey: ["course-assignments", params.id] });
    },
    onError: handleErr
  });

  const createQuizMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/courses/${params.id}/quizzes`, {
        method: "POST",
        body: JSON.stringify({
          title: quizTitle,
          timeLimitMinutes: quizLimit,
          passingScore: quizPass,
          maxAttempts: 3,
          isPublished: true
        })
      }),
    onSuccess: async () => {
      setQuizTitle("");
      setBanner("Quiz created. Add questions below.");
      setErrorMsg(null);
      await queryClient.invalidateQueries({ queryKey: ["course-quizzes", params.id] });
    },
    onError: handleErr
  });

  const addQuestionMutation = useMutation({
    mutationFn: (quizId: string) => {
      const prompt = questionPrompt[quizId] ?? "";
      const o1 = opt1[quizId] ?? "";
      const o2 = opt2[quizId] ?? "";
      const cIdx = correctIdx[quizId] ?? 0;
      return apiRequest(`/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          type: "MULTIPLE_CHOICE",
          points: 1,
          options: [
            { text: o1, isCorrect: cIdx === 0 },
            { text: o2, isCorrect: cIdx === 1 }
          ]
        })
      });
    },
    onSuccess: async (_res, quizId) => {
      setQuestionPrompt((p) => ({ ...p, [quizId]: "" }));
      setOpt1((p) => ({ ...p, [quizId]: "" }));
      setOpt2((p) => ({ ...p, [quizId]: "" }));
      setBanner("Question added to quiz.");
      setErrorMsg(null);
      await queryClient.invalidateQueries({ queryKey: ["course-quizzes", params.id] });
    },
    onError: handleErr
  });

  if (courseQuery.isLoading) return <LoadingState message="Loading course editor..." />;
  if (courseQuery.isError || !courseQuery.data) {
    return <ErrorState message="Unable to load course editor" />;
  }

  const course = courseQuery.data;
  const modules = course.modules ?? [];

  const moveModule = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= modules.length) return;
    const ids = modules.map((m) => m.id);
    const tmp = ids[index]!;
    ids[index] = ids[target]!;
    ids[target] = tmp;
    reorderModulesMutation.mutate(ids);
  };

  const moveLesson = (moduleId: string, lessons: { id: string }[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= lessons.length) return;
    const ids = lessons.map((l) => l.id);
    const tmp = ids[index]!;
    ids[index] = ids[target]!;
    ids[target] = tmp;
    reorderLessonsMutation.mutate({ moduleId, lessonIds: ids });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge value={course.status} />
              <StatusBadge value={course.difficultyLevel} />
              <span className="text-xs font-medium text-slate-500">{course.category}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{course.title}</h1>
            {course.rejectionReason && (
              <p className="mt-2 text-xs text-red-700">
                Rejection reason: {course.rejectionReason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {course.status === "DRAFT" && (
              <button
                type="button"
                disabled={submitForReviewMutation.isPending}
                onClick={() => submitForReviewMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Send className="h-3.5 w-3.5" />
                Submit for Approval
              </button>
            )}
            {course.status !== "ARCHIVED" && (
              <button
                type="button"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {(
            [
              { id: "curriculum", label: "Modules & Lessons", icon: BookOpen },
              { id: "materials", label: "Materials", icon: FileText },
              { id: "assignments", label: "Assignments", icon: ClipboardList },
              { id: "quizzes", label: "Quizzes", icon: HelpCircle },
              { id: "students", label: "Students", icon: Users },
              { id: "settings", label: "Settings", icon: BookOpen }
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setBanner(null);
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold ${
                  tab === t.id
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

      {banner && <SuccessBanner message={banner} />}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errorMsg}
        </div>
      )}

      {tab === "curriculum" && (
        <div className="space-y-6">
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="text"
              value={newModTitle}
              onChange={(e) => setNewModTitle(e.target.value)}
              placeholder="New module title..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!newModTitle.trim() || addModuleMutation.isPending}
              onClick={() => addModuleMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Module
            </button>
          </div>

          {modules.map((mod, mIdx) => (
            <div key={mod.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {mod.position}. {mod.title}
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Move module up"
                    disabled={mIdx === 0}
                    onClick={() => moveModule(mIdx, -1)}
                    className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move module down"
                    disabled={mIdx === modules.length - 1}
                    onClick={() => moveModule(mIdx, 1)}
                    className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLessonForm({
                        moduleId: mod.id,
                        title: "",
                        content: "",
                        videoUrl: "",
                        durationMinutes: 15
                      })
                    }
                    className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    + Add Lesson
                  </button>
                  <button
                    type="button"
                    aria-label="Delete module"
                    onClick={() => deleteModuleMutation.mutate(mod.id)}
                    className="rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {lessonForm?.moduleId === mod.id && (
                <div className="mt-4 space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4">
                  <input
                    type="text"
                    placeholder="Lesson title"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder="Lesson content"
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="url"
                      placeholder="Video embed URL (optional)"
                      value={lessonForm.videoUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={lessonForm.durationMinutes}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          durationMinutes: Number(e.target.value) || 10
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={addLessonMutation.isPending}
                      onClick={() => addLessonMutation.mutate()}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Save Lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonForm(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {mod.lessons.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-slate-400">No lessons yet.</li>
                ) : (
                  mod.lessons.map((lesson, lIdx) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-slate-800">
                        {lesson.position}. {lesson.title}{" "}
                        <span className="text-xs text-slate-400">
                          ({lesson.durationMinutes} min)
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={lIdx === 0}
                          onClick={() => moveLesson(mod.id, mod.lessons, lIdx, -1)}
                          className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={lIdx === mod.lessons.length - 1}
                          onClick={() => moveLesson(mod.id, mod.lessons, lIdx, 1)}
                          className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLessonMutation.mutate(lesson.id)}
                          className="rounded border border-red-200 p-1 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "materials" && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Upload Course Material</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Material title (e.g. Lecture Slides)"
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
              <Upload className="h-3.5 w-3.5" />
              <span>{matFile?.name ?? "Choose PDF/PNG/JPEG"}</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setMatFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              disabled={!matFile || uploadMaterialMutation.isPending}
              onClick={() => uploadMaterialMutation.mutate()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {uploadMaterialMutation.isPending ? "Uploading..." : "Upload & Attach"}
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {(course.materials ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
              >
                <a
                  href={getAuthorizedFileUrl(m.file.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:underline"
                >
                  {m.title} ({m.file.originalName})
                </a>
                <button
                  type="button"
                  onClick={() => deleteMaterialMutation.mutate(m.id)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "assignments" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Create Assignment</h2>
            <input
              type="text"
              placeholder="Assignment title"
              value={assignTitle}
              onChange={(e) => setAssignTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              rows={3}
              placeholder="Instructions and grading rubric..."
              value={assignDesc}
              onChange={(e) => setAssignDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                Max Score:
                <input
                  type="number"
                  value={assignMaxScore}
                  onChange={(e) => setAssignMaxScore(Number(e.target.value) || 100)}
                  className="w-20 rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={assignAllowResub}
                  onChange={(e) => setAssignAllowResub(e.target.checked)}
                />
                Allow resubmissions
              </label>
              {assignAllowResub && (
                <label className="flex items-center gap-2">
                  Max resubmissions:
                  <input
                    type="number"
                    min={0}
                    value={assignMaxResub}
                    onChange={(e) => setAssignMaxResub(Number(e.target.value) || 0)}
                    className="w-16 rounded border border-slate-300 px-2 py-1"
                  />
                </label>
              )}
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={assignAllowLate}
                  onChange={(e) => setAssignAllowLate(e.target.checked)}
                />
                Allow late submissions
              </label>
            </div>
            <button
              type="button"
              disabled={!assignTitle.trim() || !assignDesc.trim() || createAssignmentMutation.isPending}
              onClick={() => createAssignmentMutation.mutate()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Publish Assignment
            </button>
          </div>

          <div className="space-y-3">
            {(assignmentsQuery.data ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-bold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    Max Score: {a.maxScore} · {a._count?.submissions ?? 0} submissions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "quizzes" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Create Quiz</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Quiz title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
              />
              <input
                type="number"
                min={1}
                value={quizLimit}
                onChange={(e) => setQuizLimit(Number(e.target.value) || 20)}
                placeholder="Time limit (min)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                value={quizPass}
                onChange={(e) => setQuizPass(Number(e.target.value) || 1)}
                placeholder="Passing score"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={!quizTitle.trim() || createQuizMutation.isPending}
              onClick={() => createQuizMutation.mutate()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Create Quiz
            </button>
          </div>

          {(quizzesQuery.data ?? []).map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900">{q.title}</h3>
                <p className="text-xs text-slate-500">
                  {q._count?.questions ?? 0} questions · {q.timeLimitMinutes} min · Passing:{" "}
                  {q.passingScore}
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-700">Add Multiple-Choice Question</p>
                <input
                  type="text"
                  placeholder="Question prompt..."
                  value={questionPrompt[q.id] ?? ""}
                  onChange={(e) =>
                    setQuestionPrompt((p) => ({ ...p, [q.id]: e.target.value }))
                  }
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Option 1"
                    value={opt1[q.id] ?? ""}
                    onChange={(e) => setOpt1((p) => ({ ...p, [q.id]: e.target.value }))}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Option 2"
                    value={opt2[q.id] ?? ""}
                    onChange={(e) => setOpt2((p) => ({ ...p, [q.id]: e.target.value }))}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <select
                    value={correctIdx[q.id] ?? 0}
                    onChange={(e) =>
                      setCorrectIdx((p) => ({ ...p, [q.id]: Number(e.target.value) }))
                    }
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs"
                  >
                    <option value={0}>Option 1 is Correct</option>
                    <option value={1}>Option 2 is Correct</option>
                  </select>
                  <button
                    type="button"
                    disabled={addQuestionMutation.isPending}
                    onClick={() => addQuestionMutation.mutate(q.id)}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "students" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Enrolled Students</h2>
          {studentsQuery.isLoading ? (
            <LoadingState message="Loading roster..." />
          ) : (studentsQuery.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No students enrolled yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(studentsQuery.data ?? []).map((s) => (
                    <tr key={s.enrollmentId}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{s.student.name}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{s.student.email}</td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge value={s.status} />
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">
                        {s.progressPercent}% ({s.completedLessons}/{s.totalLessons})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Course Metadata</h2>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={editDiff}
              onChange={(e) => setEditDiff(e.target.value as DifficultyLevel)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <textarea
            rows={4}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saveSettingsMutation.isPending}
            onClick={() => saveSettingsMutation.mutate()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
