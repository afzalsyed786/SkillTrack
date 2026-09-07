import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "../lib/supabase";

interface Skill {
  id: number;
  name: string;
  category: string | null;
  created_at: string;
}

interface SkillForm {
  name: string;
  category: string;
}

const emptyForm: SkillForm = {
  name: "",
  category: "",
};

export default function AdminSkills() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] =
    useState<Skill | null>(null);

  const [form, setForm] =
    useState<SkillForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  /* ================================
     LOAD SKILLS
  ================================= */

  const loadSkills = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("skills")
        .select("id, name, category, created_at")
        .order("name", { ascending: true });

      if (error) throw error;

      setSkills(data ?? []);
    } catch (error) {
      console.error("Error loading skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  /* ================================
     FILTER
  ================================= */

  const filteredSkills = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return skills;

    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(value) ||
        (skill.category ?? "")
          .toLowerCase()
          .includes(value)
    );
  }, [skills, search]);

  /* ================================
     OPEN ADD MODAL
  ================================= */

  const openAddModal = () => {
    setEditingSkill(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  /* ================================
     OPEN EDIT MODAL
  ================================= */

  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);

    setForm({
      name: skill.name,
      category: skill.category ?? "",
    });

    setShowModal(true);
  };

  /* ================================
     CLOSE MODAL
  ================================= */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSkill(null);
    setForm(emptyForm);
  };

  /* ================================
     SAVE SKILL
  ================================= */

  const saveSkill = async () => {
    const name = form.name.trim();
    const category = form.category.trim();

    if (!name) {
      toast.error("Skill name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingSkill) {
        const { error } = await supabase
          .from("skills")
          .update({
            name,
            category: category || null,
          })
          .eq("id", editingSkill.id);

        if (error) {
          if (error.code === "23505") {
            toast.error(
              "A skill with this name already exists"
            );
            return;
          }

          throw error;
        }

        toast.success("Skill updated successfully");
      } else {
        const { error } = await supabase
          .from("skills")
          .insert({
            name,
            category: category || null,
          });

        if (error) {
          if (error.code === "23505") {
            toast.error(
              "A skill with this name already exists"
            );
            return;
          }

          throw error;
        }

        toast.success("Skill added successfully");
      }

      closeModal();
      await loadSkills();
    } catch (error) {
      console.error("Error saving skill:", error);
      toast.error("Failed to save skill");
    } finally {
      setSaving(false);
    }
  };

  /* ================================
     DELETE SKILL
  ================================= */

  const deleteSkill = async (skill: Skill) => {
    const confirmed = window.confirm(
      `Delete "${skill.name}"?\n\nThis will fail if the skill is currently being used by trainees, courses, or industry-demand mappings.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", skill.id);

      if (error) {
        if (error.code === "23503") {
          toast.error(
            "This skill is currently being used and cannot be deleted."
          );
          return;
        }

        throw error;
      }

      toast.success("Skill deleted successfully");

      await loadSkills();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast.error("Failed to delete skill");
    }
  };

  /* ================================
     UI
  ================================= */

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                navigate("/admin/dashboard")
              }
              className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              title="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <Wrench size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Skills Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage skills used across SkillTrack
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Skill
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* STATS */}

        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Total Skills
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {skills.length}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Skills available in the platform
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Categories
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                new Set(
                  skills
                    .map((skill) => skill.category)
                    .filter(Boolean)
                ).size
              }
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Skill categories
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Showing
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredSkills.length}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Skills matching your search
            </p>
          </div>
        </div>

        {/* SEARCH + REFRESH */}

        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by skill or category..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={loadSkills}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* SKILLS */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-bold text-slate-900">
              All Skills
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add and maintain skills used for
              training and skill-gap analysis.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                <p className="mt-4 text-sm text-slate-500">
                  Loading skills...
                </p>
              </div>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Wrench
                size={40}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No skills found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a new
                skill.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-slate-900">
                        {skill.name}
                      </h3>

                      {skill.category ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {skill.category}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                          Uncategorized
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Skill ID: {skill.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        openEditModal(skill)
                      }
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteSkill(skill)
                      }
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ================================
          ADD / EDIT MODAL
      ================================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-900">
                {editingSkill
                  ? "Edit Skill"
                  : "Add New Skill"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingSkill
                  ? "Update the skill information."
                  : "Create a new skill for SkillTrack."}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Skill Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. TensorFlow"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* CATEGORY */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>

                <input
                  type="text"
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                  placeholder="e.g. Programming, Data Science"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* ACTIONS */}

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveSkill}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {editingSkill
                  ? "Update Skill"
                  : "Add Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}