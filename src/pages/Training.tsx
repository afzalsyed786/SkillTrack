import {
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  Trash2,
  UserCircle,
  Wrench,
  XCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Course {
  id: number;
  name: string;
  provider: string | null;
  description: string | null;
  duration_months: number | null;
}

interface Training {
  id: number;
  course_id: number;
  start_date: string | null;
  completion_date: string | null;
  status:
    | "ONGOING"
    | "COMPLETED"
    | "DROPPED";
  courses: {
    name: string;
    provider: string | null;
  } | null;
}

const navigationItems = [
  {
    label: "Dashboard",
    path: "/trainee/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Profile",
    path: "/trainee/profile",
    icon: UserCircle,
  },
  {
    label: "Skills",
    path: "/trainee/skills",
    icon: Wrench,
  },
  {
    label: "Training",
    path: "/trainee/training",
    icon: GraduationCap,
  },
  {
    label: "Employment",
    path: "/trainee/employment",
    icon: ClipboardCheck,
  },
  {
    label: "Feedback",
    path: "/trainee/feedback",
    icon: BookOpen,
  },
  {
    label: "Skill Gap",
    path: "/trainee/skill-gap",
    icon: BarChart3,
  },
];

type TrainingStatus =
  | "ONGOING"
  | "COMPLETED"
  | "DROPPED";

export default function Training() {
  const { user, appUser, logout } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [trainings, setTrainings] =
    useState<Training[]>([]);

  const [courseId, setCourseId] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [completionDate, setCompletionDate] =
    useState("");

  const [status, setStatus] =
    useState<TrainingStatus>("COMPLETED");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      /* =========================
         LOAD COURSES
      ========================= */

      const {
        data: courseData,
        error: courseError,
      } = await supabase
        .from("courses")
        .select(
          `
          id,
          name,
          provider,
          description,
          duration_months
          `
        )
        .order("name");

      if (courseError) {
        console.error(
          "Course loading error:",
          courseError
        );

        toast.error(
          "Unable to load available courses."
        );

        return;
      }

      setCourses(courseData ?? []);

      /* =========================
         FIND TRAINEE
      ========================= */

      const {
        data: trainee,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (traineeError) {
        console.error(
          "Trainee lookup error:",
          traineeError
        );

        toast.error(
          "Unable to load your trainee profile."
        );

        return;
      }

      if (!trainee) {
        toast.error(
          "Please complete your profile first."
        );

        return;
      }

      /* =========================
         LOAD TRAINING HISTORY
      ========================= */

      const {
        data: trainingData,
        error: trainingError,
      } = await supabase
        .from("trainings")
        .select(
          `
          id,
          course_id,
          start_date,
          completion_date,
          status,
          courses (
            name,
            provider
          )
          `
        )
        .eq("trainee_id", trainee.id)
        .order("created_at", {
          ascending: false,
        });

      if (trainingError) {
        console.error(
          "Training loading error:",
          trainingError
        );

        toast.error(
          "Unable to load your training history."
        );

        return;
      }

      setTrainings(
        (trainingData as unknown as Training[]) ??
          []
      );
    } catch (error) {
      console.error(
        "Unexpected training loading error:",
        error
      );

      toast.error(
        "Something went wrong while loading training."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  /* =========================
     ADD TRAINING
  ========================= */

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      toast.error("You are not logged in.");
      return;
    }

    if (!courseId) {
      toast.error(
        "Please select a course."
      );
      return;
    }

    if (!startDate) {
      toast.error(
        "Please select a start date."
      );
      return;
    }

    if (
      status === "COMPLETED" &&
      !completionDate
    ) {
      toast.error(
        "Please select a completion date for completed training."
      );

      return;
    }

    if (
      completionDate &&
      completionDate < startDate
    ) {
      toast.error(
        "Completion date cannot be before the start date."
      );

      return;
    }

    setSaving(true);

    try {
      /* =========================
         FIND TRAINEE
      ========================= */

      const {
        data: trainee,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (traineeError) {
        console.error(
          "Trainee lookup error:",
          traineeError
        );

        toast.error(
          "Unable to find your trainee profile."
        );

        return;
      }

      if (!trainee) {
        toast.error(
          "Please complete your profile first."
        );

        navigate("/trainee/profile");

        return;
      }

      /* =========================
         INSERT TRAINING
      ========================= */

      const { error } = await supabase
        .from("trainings")
        .insert({
          trainee_id: trainee.id,
          course_id: Number(courseId),
          start_date: startDate,
          completion_date:
            status === "COMPLETED"
              ? completionDate
              : null,
          status,
        });

      if (error) {
        console.error(
          "Add training error:",
          error
        );

        toast.error(error.message);

        return;
      }

      toast.success(
        "Training added successfully!"
      );

      /* Reset form */

      setCourseId("");
      setStartDate("");
      setCompletionDate("");
      setStatus("COMPLETED");

      await loadData();
    } catch (error) {
      console.error(
        "Unexpected add training error:",
        error
      );

      toast.error(
        "Something went wrong while adding training."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     DELETE TRAINING
  ========================= */

  const handleDelete = async (
    id: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this training record?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "Delete training error:",
          error
        );

        toast.error(
          "Unable to remove training."
        );

        return;
      }

      toast.success(
        "Training removed successfully."
      );

      setTrainings((current) =>
        current.filter(
          (training) =>
            training.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Unexpected delete training error:",
        error
      );

      toast.error(
        "Something went wrong while removing training."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  /* =========================
     HELPERS
  ========================= */

  const formatDate = (
    date: string | null
  ) => {
    if (!date) {
      return "Not provided";
    }

    const parsedDate = new Date(
      `${date}T00:00:00`
    );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getStatusLabel = (
    trainingStatus: TrainingStatus
  ) => {
    if (
      trainingStatus === "COMPLETED"
    ) {
      return "Completed";
    }

    if (
      trainingStatus === "ONGOING"
    ) {
      return "Ongoing";
    }

    return "Dropped";
  };

  const getStatusClasses = (
    trainingStatus: TrainingStatus
  ) => {
    if (
      trainingStatus === "COMPLETED"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      trainingStatus === "ONGOING"
    ) {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-red-100 text-red-700";
  };

  const getStatusIcon = (
    trainingStatus: TrainingStatus
  ) => {
    if (
      trainingStatus === "COMPLETED"
    ) {
      return (
        <CheckCircle2 size={15} />
      );
    }

    if (
      trainingStatus === "ONGOING"
    ) {
      return <Clock3 size={15} />;
    }

    return <XCircle size={15} />;
  };

  const completedCount =
    trainings.filter(
      (training) =>
        training.status === "COMPLETED"
    ).length;

  const ongoingCount =
    trainings.filter(
      (training) =>
        training.status === "ONGOING"
    ).length;

  const droppedCount =
    trainings.filter(
      (training) =>
        training.status === "DROPPED"
    ).length;

  const completionRate =
    trainings.length > 0
      ? Math.round(
          (completedCount /
            trainings.length) *
            100
        )
      : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading training...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =========================
          HEADER
      ========================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-16 items-center justify-between gap-4">
            {/* Logo */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/trainee/dashboard"
                )
              }
              className="flex shrink-0 items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <BarChart3 size={22} />
              </div>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-900">
                  Skill
                  <span className="text-blue-600">
                    Track
                  </span>
                </h1>

                <p className="text-xs text-slate-500">
                  Post-Training Analytics
                </p>
              </div>
            </button>

            {/* User */}

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-32 truncate text-sm font-semibold text-slate-800">
                  {appUser?.full_name ||
                    "Trainee"}
                </p>

                <p className="text-xs text-slate-500">
                  Trainee
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                {(
                  appUser?.full_name ||
                  "T"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:flex"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* Desktop / Mobile Navigation */}

          <nav className="flex gap-1 overflow-x-auto pb-3 pt-1">
            {navigationItems.map(
              (item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({
                      isActive,
                    }) =>
                      `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon size={15} />

                    {item.label}
                  </NavLink>
                );
              }
            )}

            {/* Mobile Logout */}

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 sm:hidden"
            >
              <LogOut size={15} />
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Breadcrumb */}

        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/trainee/dashboard"
              )
            }
            className="transition hover:text-blue-600"
          >
            Dashboard
          </button>

          <ChevronRight size={15} />

          <span className="text-slate-700">
            Training
          </span>
        </div>

        {/* Page Heading */}

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <GraduationCap
                  size={25}
                />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                  Learning Journey
                </p>

                <h2 className="text-3xl font-bold text-slate-900">
                  Manage Your Training
                </h2>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-slate-600">
              Record courses and training
              programs you have completed,
              are currently attending, or
              have dropped.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Total Training
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-700">
              {trainings.length}
            </p>
          </div>
        </div>

        {/* =========================
            TRAINING STATS
        ========================= */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Completed */}

          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <CheckCircle2
                  size={19}
                />
              </div>
            </div>

            <p className="mt-3 text-3xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>

          {/* Ongoing */}

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Ongoing
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Clock3 size={19} />
              </div>
            </div>

            <p className="mt-3 text-3xl font-bold text-blue-600">
              {ongoingCount}
            </p>
          </div>

          {/* Dropped */}

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Dropped
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <XCircle size={19} />
              </div>
            </div>

            <p className="mt-3 text-3xl font-bold text-red-600">
              {droppedCount}
            </p>
          </div>

          {/* Completion Rate */}

          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Completion Rate
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <BarChart3
                  size={19}
                />
              </div>
            </div>

            <p className="mt-3 text-3xl font-bold text-purple-600">
              {completionRate}%
            </p>
          </div>
        </div>

        {/* =========================
            ADD TRAINING
        ========================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Plus size={22} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Add Training
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add a course or training
                program to your learning
                history.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7 grid gap-6 md:grid-cols-2"
          >
            {/* Course */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Course
              </label>

              <select
                value={courseId}
                onChange={(e) =>
                  setCourseId(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  Select a course
                </option>

                {courses.map(
                  (course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}

                      {course.provider
                        ? ` — ${course.provider}`
                        : ""}
                    </option>
                  )
                )}
              </select>

              {courses.length ===
                0 && (
                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No courses are
                  currently available.
                </div>
              )}

              {courseId && (
                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                  {(() => {
                    const selectedCourse =
                      courses.find(
                        (course) =>
                          String(
                            course.id
                          ) ===
                          courseId
                      );

                    if (
                      !selectedCourse
                    ) {
                      return null;
                    }

                    return (
                      <>
                        <p className="font-semibold text-slate-800">
                          {
                            selectedCourse.name
                          }
                        </p>

                        {selectedCourse.description && (
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {
                              selectedCourse.description
                            }
                          </p>
                        )}

                        {selectedCourse.duration_months !==
                          null && (
                          <p className="mt-2 text-xs font-medium text-slate-400">
                            Duration:{" "}
                            {
                              selectedCourse.duration_months
                            }{" "}
                            month
                            {selectedCourse.duration_months !==
                            1
                              ? "s"
                              : ""}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Start Date */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Completion Date */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Completion Date
              </label>

              <input
                type="date"
                value={completionDate}
                onChange={(e) =>
                  setCompletionDate(
                    e.target.value
                  )
                }
                disabled={
                  saving ||
                  status !==
                    "COMPLETED"
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {status !==
                "COMPLETED" && (
                <p className="mt-2 text-xs text-slate-500">
                  Completion date is
                  only used for
                  completed training.
                </p>
              )}
            </div>

            {/* Status */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Training Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target
                      .value as TrainingStatus
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="COMPLETED">
                  Completed
                </option>

                <option value="ONGOING">
                  Ongoing
                </option>

                <option value="DROPPED">
                  Dropped
                </option>
              </select>
            </div>

            {/* Submit */}

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  saving ||
                  courses.length ===
                    0
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                    Saving...
                  </>
                ) : (
                  <>
                    <Plus size={19} />

                    Add Training
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* =========================
            TRAINING HISTORY
        ========================= */}

        <section className="mt-8">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-slate-900">
              My Training History
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Courses and training
              programs associated with
              your profile.
            </p>
          </div>

          {trainings.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <GraduationCap
                  size={28}
                />
              </div>

              <h4 className="mt-4 text-lg font-semibold text-slate-800">
                No training added yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your courses and
                training programs above.
                Your training history
                helps SkillTrack
                understand your
                learning journey.
              </p>

              <button
                type="button"
                onClick={() =>
                  window.scrollTo(
                    {
                      top: 0,
                      behavior:
                        "smooth",
                    }
                  )
                }
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Your First Training
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {trainings.map(
                (training) => (
                  <div
                    key={
                      training.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      {/* Course */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <BookOpen
                              size={21}
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="break-words text-lg font-bold text-slate-900">
                              {training
                                .courses
                                ?.name ??
                                "Unknown Course"}
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              {training
                                .courses
                                ?.provider ??
                                "Provider not specified"}
                            </p>
                          </div>

                          <span
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                              training.status
                            )}`}
                          >
                            {getStatusIcon(
                              training.status
                            )}

                            {getStatusLabel(
                              training.status
                            )}
                          </span>
                        </div>

                        {/* Dates */}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Start Date
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {formatDate(
                                training.start_date
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Completion Date
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {formatDate(
                                training.completion_date
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Delete */}

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              training.id
                            )
                          }
                          disabled={
                            deletingId ===
                            training.id
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                        >
                          <Trash2
                            size={16}
                          />

                          {deletingId ===
                          training.id
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* =========================
            NEXT STEP
        ========================= */}

        <section className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={20}
                  className="text-blue-600"
                />

                <h3 className="text-lg font-bold text-slate-900">
                  Continue building your profile
                </h3>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add your skills and
                employment information so
                SkillTrack can generate
                more meaningful skill-gap
                analytics.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/trainee/skills"
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Add Skills
                <ChevronRight
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/trainee/employment"
                  )
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Add Employment
                <ChevronRight
                  size={17}
                />
              </button>
            </div>
          </div>
        </section>

        {/* =========================
            FOOTER
        ========================= */}

        <footer className="mt-10 border-t border-slate-200 pt-6 text-center">
          <p className="text-sm text-slate-500">
            SkillTrack — Post-Training
            Skill Gap Analytics Platform
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Track your skills. Understand
            the gap. Build your career.
          </p>
        </footer>
      </main>
    </div>
  );
}