import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "../lib/supabase";

interface Industry {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface IndustryForm {
  name: string;
  description: string;
}

const emptyForm: IndustryForm = {
  name: "",
  description: "",
};

export default function AdminIndustries() {
  const navigate = useNavigate();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingIndustry, setEditingIndustry] =
    useState<Industry | null>(null);

  const [form, setForm] =
    useState<IndustryForm>(emptyForm);

  const [saving, setSaving] = useState(false);

  /* ================================
     LOAD INDUSTRIES
  ================================= */

  const loadIndustries = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("industries")
        .select("id, name, description, created_at")
        .order("name", { ascending: true });

      if (error) throw error;

      setIndustries(data ?? []);
    } catch (error) {
      console.error(
        "Error loading industries:",
        error
      );

      toast.error("Failed to load industries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndustries();
  }, []);

  /* ================================
     SEARCH
  ================================= */

  const filteredIndustries = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return industries;
    }

    return industries.filter(
      (industry) =>
        industry.name
          .toLowerCase()
          .includes(value) ||
        (industry.description ?? "")
          .toLowerCase()
          .includes(value)
    );
  }, [industries, search]);

  /* ================================
     ADD
  ================================= */

  const openAddModal = () => {
    setEditingIndustry(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  /* ================================
     EDIT
  ================================= */

  const openEditModal = (
    industry: Industry
  ) => {
    setEditingIndustry(industry);

    setForm({
      name: industry.name,
      description: industry.description ?? "",
    });

    setShowModal(true);
  };

  /* ================================
     CLOSE MODAL
  ================================= */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingIndustry(null);
    setForm(emptyForm);
  };

  /* ================================
     SAVE
  ================================= */

  const saveIndustry = async () => {
    const name = form.name.trim();
    const description =
      form.description.trim();

    if (!name) {
      toast.error("Industry name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingIndustry) {
        const { error } = await supabase
          .from("industries")
          .update({
            name,
            description:
              description || null,
          })
          .eq("id", editingIndustry.id);

        if (error) {
          if (error.code === "23505") {
            toast.error(
              "An industry with this name already exists"
            );
            return;
          }

          throw error;
        }

        toast.success(
          "Industry updated successfully"
        );
      } else {
        const { error } = await supabase
          .from("industries")
          .insert({
            name,
            description:
              description || null,
          });

        if (error) {
          if (error.code === "23505") {
            toast.error(
              "An industry with this name already exists"
            );
            return;
          }

          throw error;
        }

        toast.success(
          "Industry added successfully"
        );
      }

      closeModal();
      await loadIndustries();
    } catch (error) {
      console.error(
        "Error saving industry:",
        error
      );

      toast.error("Failed to save industry");
    } finally {
      setSaving(false);
    }
  };

  /* ================================
     DELETE
  ================================= */

  const deleteIndustry = async (
    industry: Industry
  ) => {
    const confirmed = window.confirm(
      `Delete "${industry.name}"?\n\nThis industry may be used by job roles, employment records, or skill-demand mappings.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("industries")
        .delete()
        .eq("id", industry.id);

      if (error) {
        if (error.code === "23503") {
          toast.error(
            "This industry is currently being used and cannot be deleted."
          );
          return;
        }

        throw error;
      }

      toast.success(
        "Industry deleted successfully"
      );

      await loadIndustries();
    } catch (error) {
      console.error(
        "Error deleting industry:",
        error
      );

      toast.error(
        "Failed to delete industry"
      );
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
              <Building2 size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Industries Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage industries used across SkillTrack
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Industry
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* STATS */}

        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Total Industries
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {industries.length}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Industries available in SkillTrack
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              With Description
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                industries.filter(
                  (industry) =>
                    Boolean(
                      industry.description?.trim()
                    )
                ).length
              }
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Industries with additional information
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Showing
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredIndustries.length}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Industries matching your search
            </p>
          </div>
        </div>

        {/* SEARCH */}

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
              placeholder="Search by industry or description..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={loadIndustries}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* INDUSTRY LIST */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-bold text-slate-900">
              All Industries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage industries used for employment
              and skill-demand analysis.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                <p className="mt-4 text-sm text-slate-500">
                  Loading industries...
                </p>
              </div>
            </div>
          ) : filteredIndustries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Building2
                size={40}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No industries found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a new
                industry.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIndustries.map(
                (industry) => (
                  <div
                    key={industry.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {industry.name}
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        {industry.description ||
                          "No description available."}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Industry ID: {industry.id}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() =>
                          openEditModal(
                            industry
                          )
                        }
                        className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteIndustry(
                            industry
                          )
                        }
                        className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* ADD / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold text-slate-900">
                {editingIndustry
                  ? "Edit Industry"
                  : "Add New Industry"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingIndustry
                  ? "Update the industry information."
                  : "Create a new industry for SkillTrack."}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Industry Name *
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
                  placeholder="e.g. FinTech"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Describe the industry..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                onClick={saveIndustry}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {editingIndustry
                  ? "Update Industry"
                  : "Add Industry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}