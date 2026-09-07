import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface Industry {
  id: number;
  name: string;
}

interface JobRole {
  id: number;
  title: string;
  industry_id: number | null;
  description: string | null;
  created_at: string;
  industry?: {
    name: string;
  } | null;
}

export default function AdminJobRoles() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);

  const [title, setTitle] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    setLoading(true);

    const [rolesResult, industriesResult] = await Promise.all([
      supabase
        .from("job_roles")
        .select(`
          id,
          title,
          industry_id,
          description,
          created_at,
          industries (
            name
          )
        `)
        .order("title"),

      supabase
        .from("industries")
        .select("id, name")
        .order("name"),
    ]);

    if (rolesResult.error) {
      console.error(rolesResult.error);
      toast.error("Failed to load job roles");
    } else {
      const formattedRoles = (rolesResult.data ?? []).map((role: any) => ({
        ...role,
        industry: role.industries
          ? { name: role.industries.name }
          : null,
      }));

      setJobRoles(formattedRoles);
    }

    if (industriesResult.error) {
      console.error(industriesResult.error);
      toast.error("Failed to load industries");
    } else {
      setIndustries(industriesResult.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRoles = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return jobRoles;
    }

    return jobRoles.filter((role) => {
      return (
        role.title.toLowerCase().includes(value) ||
        role.description?.toLowerCase().includes(value) ||
        role.industry?.name.toLowerCase().includes(value)
      );
    });
  }, [jobRoles, search]);

  const resetForm = () => {
    setTitle("");
    setIndustryId("");
    setDescription("");
    setEditingRole(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingRole(null);
    setTitle("");
    setIndustryId("");
    setDescription("");
    setShowForm(true);
  };

  const openEditForm = (role: JobRole) => {
    setEditingRole(role);
    setTitle(role.title);
    setIndustryId(role.industry_id?.toString() ?? "");
    setDescription(role.description ?? "");
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Job role title is required");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      industry_id: industryId ? Number(industryId) : null,
      description: description.trim() || null,
    };

    if (editingRole) {
      const { error } = await supabase
        .from("job_roles")
        .update(payload)
        .eq("id", editingRole.id);

      if (error) {
        console.error(error);

        if (error.code === "23505") {
          toast.error("A job role with this title already exists");
        } else {
          toast.error(error.message);
        }

        setSaving(false);
        return;
      }

      toast.success("Job role updated successfully");
    } else {
      const { error } = await supabase
        .from("job_roles")
        .insert(payload);

      if (error) {
        console.error(error);

        if (error.code === "23505") {
          toast.error("A job role with this title already exists");
        } else {
          toast.error(error.message);
        }

        setSaving(false);
        return;
      }

      toast.success("Job role added successfully");
    }

    setSaving(false);
    resetForm();
    await fetchData();
  };

  const handleDelete = async (role: JobRole) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${role.title}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("job_roles")
      .delete()
      .eq("id", role.id);

    if (error) {
      console.error(error);

      if (error.code === "23503") {
        toast.error(
          "This job role cannot be deleted because it is used by employment records."
        );
      } else {
        toast.error(error.message);
      }

      return;
    }

    toast.success("Job role deleted successfully");
    await fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Job Roles Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage job roles and their industry associations
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Job Roles
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {jobRoles.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Industries
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {industries.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Filtered Results
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredRoles.length}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search job roles..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={17} />
                Refresh
              </button>

              <button
                onClick={openAddForm}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Job Role
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                {editingRole ? "Edit Job Role" : "Add Job Role"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the job role information below.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Job Role Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Data Scientist"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Industry
                </label>

                <select
                  value={industryId}
                  onChange={(event) => setIndustryId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select industry</option>

                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the role..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingRole
                    ? "Update Job Role"
                    : "Add Job Role"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Job Roles
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="mt-4 text-sm text-slate-500">
                Loading job roles...
              </p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-700">
                No job roles found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a new job role.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {role.title}
                    </h3>

                    <p className="mt-1 text-sm text-blue-600">
                      {role.industry?.name ?? "No industry assigned"}
                    </p>

                    {role.description && (
                      <p className="mt-2 max-w-3xl text-sm text-slate-500">
                        {role.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEditForm(role)}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(role)}
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
    </div>
  );
}