import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface Course {
  id: number;
  name: string;
  provider: string | null;
  description: string | null;
  duration_months: number | null;
  created_at: string;
}

interface CourseForm {
  name: string;
  provider: string;
  description: string;
  duration_months: string;
}

const emptyForm: CourseForm = {
  name: "",
  provider: "",
  description: "",
  duration_months: "",
};

export default function AdminCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(
    null
  );

  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCourses = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, name, provider, description, duration_months, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCourses(data ?? []);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return courses;
    }

    return courses.filter((course) => {
      return (
        course.name.toLowerCase().includes(term) ||
        (course.provider ?? "").toLowerCase().includes(term) ||
        (course.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [courses, search]);

  const openAddForm = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (course: Course) => {
    setEditingCourse(course);

    setForm({
      name: course.name,
      provider: course.provider ?? "",
      description: course.description ?? "",
      duration_months:
        course.duration_months !== null
          ? String(course.duration_months)
          : "",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingCourse(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      toast.error("Course name is required");
      return;
    }

    let duration: number | null = null;

    if (form.duration_months.trim()) {
      duration = Number(form.duration_months);

      if (!Number.isFinite(duration) || duration <= 0) {
        toast.error("Enter a valid course duration");
        return;
      }
    }

    setSaving(true);

    try {
      const courseData = {
        name,
        provider: form.provider.trim() || null,
        description: form.description.trim() || null,
        duration_months: duration,
      };

      if (editingCourse) {
        const { data, error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingCourse.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setCourses((current) =>
          current.map((course) =>
            course.id === editingCourse.id
              ? (data as Course)
              : course
          )
        );

        toast.success("Course updated successfully");
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert(courseData)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setCourses((current) => [
          data as Course,
          ...current,
        ]);

        toast.success("Course added successfully");
      }

      closeForm();
    } catch (error: any) {
      console.error("Course save error:", error);

      if (error?.code === "23505") {
        toast.error("A course with this name already exists");
      } else {
        toast.error(
          error?.message || "Failed to save course"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (course: Course) => {
    const confirmed = window.confirm(
      `Delete "${course.name}"?\n\nThis can only be deleted if no training record is currently using this course.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (error) {
        throw error;
      }

      setCourses((current) =>
        current.filter((item) => item.id !== course.id)
      );

      toast.success("Course deleted successfully");
    } catch (error: any) {
      console.error("Course delete error:", error);

      if (error?.code === "23503") {
        toast.error(
          "This course cannot be deleted because it is already used in training records."
        );
      } else {
        toast.error(
          error?.message || "Failed to delete course"
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              title="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Course Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Add, edit and manage SkillTrack courses
              </p>
            </div>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Course
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Courses
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {courses.length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <BookOpen size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Search Results
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredCourses.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Providers
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                new Set(
                  courses
                    .map((course) => course.provider)
                    .filter(Boolean)
                ).size
              }
            </p>
          </div>
        </div>

        {/* Search + Refresh */}

        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search courses by name, provider or description..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={loadCourses}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Loading */}

        {loading && (
          <div className="flex min-h-60 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="text-center">
              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading courses...
              </p>
            </div>
          </div>
        )}

        {/* Empty */}

        {!loading && filteredCourses.length === 0 && (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <BookOpen
              size={42}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No courses found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Add your first course to SkillTrack."}
            </p>

            {!search && (
              <button
                onClick={openAddForm}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Add First Course
              </button>
            )}
          </div>
        )}

        {/* Course Cards */}

        {!loading && filteredCourses.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <BookOpen size={22} />
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    #{course.id}
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  {course.name}
                </h2>

                <p className="mt-2 text-sm font-medium text-blue-600">
                  {course.provider || "Provider not specified"}
                </p>

                <p className="mt-4 min-h-16 text-sm leading-6 text-slate-500">
                  {course.description ||
                    "No course description provided."}
                </p>

                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Duration
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {course.duration_months !== null
                      ? `${course.duration_months} month${
                          Number(course.duration_months) === 1
                            ? ""
                            : "s"
                        }`
                      : "Not specified"}
                  </p>
                </div>

                <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => openEditForm(course)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => deleteCourse(course)}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingCourse
                    ? "Edit Course"
                    : "Add New Course"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingCourse
                    ? "Update the course information."
                    : "Create a new training course."}
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {/* Course Name */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Course Name *
                </label>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Advanced Python for Data Science"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Provider */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Provider
                </label>

                <input
                  value={form.provider}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      provider: event.target.value,
                    })
                  }
                  placeholder="e.g. SkillTrack Academy"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Duration */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Duration (months)
                </label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.duration_months}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      duration_months:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. 3"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Description */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe what trainees will learn..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Actions */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingCourse
                    ? "Update Course"
                    : "Add Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}