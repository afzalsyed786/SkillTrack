import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface Industry {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
  category: string | null;
}

interface IndustrySkill {
  industry_id: number;
  skill_id: number;
  demand_percentage: number;
  industry?: {
    name: string;
  } | null;
  skill?: {
    name: string;
    category: string | null;
  } | null;
}

export default function AdminSkillDemand() {
  const [records, setRecords] = useState<IndustrySkill[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<IndustrySkill | null>(null);

  const [industryId, setIndustryId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [demandPercentage, setDemandPercentage] = useState("");

  const fetchData = async () => {
    setLoading(true);

    try {
      const [
        industrySkillsResult,
        industriesResult,
        skillsResult,
      ] = await Promise.all([
        supabase
          .from("industry_skills")
          .select("industry_id, skill_id, demand_percentage")
          .order("industry_id")
          .order("skill_id"),

        supabase
          .from("industries")
          .select("id, name")
          .order("name"),

        supabase
          .from("skills")
          .select("id, name, category")
          .order("name"),
      ]);

      if (industrySkillsResult.error) {
        console.error(industrySkillsResult.error);
        toast.error("Failed to load skill demand data");
      }

      if (industriesResult.error) {
        console.error(industriesResult.error);
        toast.error("Failed to load industries");
      }

      if (skillsResult.error) {
        console.error(skillsResult.error);
        toast.error("Failed to load skills");
      }

      const industryData = industriesResult.data ?? [];
      const skillData = skillsResult.data ?? [];
      const demandData = industrySkillsResult.data ?? [];

      const industryMap = new Map<number, Industry>();
      industryData.forEach((industry) => {
        industryMap.set(industry.id, industry);
      });

      const skillMap = new Map<number, Skill>();
      skillData.forEach((skill) => {
        skillMap.set(skill.id, skill);
      });

      const formattedRecords = demandData.map((record) => ({
        ...record,
        demand_percentage: Number(record.demand_percentage),
        industry: industryMap.get(record.industry_id)
          ? {
              name: industryMap.get(record.industry_id)!.name,
            }
          : null,
        skill: skillMap.get(record.skill_id)
          ? {
              name: skillMap.get(record.skill_id)!.name,
              category:
                skillMap.get(record.skill_id)!.category,
            }
          : null,
      }));

      setRecords(formattedRecords);
      setIndustries(industryData);
      setSkills(skillData);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load skill demand data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return records;
    }

    return records.filter((record) => {
      return (
        record.industry?.name
          .toLowerCase()
          .includes(value) ||
        record.skill?.name
          .toLowerCase()
          .includes(value) ||
        record.skill?.category
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [records, search]);

  const resetForm = () => {
    setIndustryId("");
    setSkillId("");
    setDemandPercentage("");
    setEditingRecord(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingRecord(null);
    setIndustryId("");
    setSkillId("");
    setDemandPercentage("");
    setShowForm(true);
  };

  const openEditForm = (record: IndustrySkill) => {
    setEditingRecord(record);
    setIndustryId(record.industry_id.toString());
    setSkillId(record.skill_id.toString());
    setDemandPercentage(
      record.demand_percentage.toString()
    );
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!industryId) {
      toast.error("Please select an industry");
      return;
    }

    if (!skillId) {
      toast.error("Please select a skill");
      return;
    }

    const demand = Number(demandPercentage);

    if (
      demandPercentage.trim() === "" ||
      Number.isNaN(demand) ||
      demand < 0 ||
      demand > 100
    ) {
      toast.error(
        "Demand percentage must be between 0 and 100"
      );
      return;
    }

    setSaving(true);

    const payload = {
      industry_id: Number(industryId),
      skill_id: Number(skillId),
      demand_percentage: demand,
    };

    try {
      if (editingRecord) {
        const originalIndustryId =
          editingRecord.industry_id;
        const originalSkillId = editingRecord.skill_id;

        const { error } = await supabase
          .from("industry_skills")
          .update(payload)
          .eq("industry_id", originalIndustryId)
          .eq("skill_id", originalSkillId);

        if (error) {
          console.error(error);

          if (error.code === "23505") {
            toast.error(
              "This industry-skill combination already exists"
            );
          } else {
            toast.error(error.message);
          }

          return;
        }

        toast.success(
          "Skill demand updated successfully"
        );
      } else {
        const { error } = await supabase
          .from("industry_skills")
          .insert(payload);

        if (error) {
          console.error(error);

          if (error.code === "23505") {
            toast.error(
              "This industry-skill combination already exists"
            );
          } else {
            toast.error(error.message);
          }

          return;
        }

        toast.success(
          "Skill demand added successfully"
        );
      }

      resetForm();
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save skill demand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: IndustrySkill) => {
    const industryName =
      record.industry?.name ?? "this industry";

    const skillName =
      record.skill?.name ?? "this skill";

    const confirmed = window.confirm(
      `Delete the demand mapping for ${skillName} in ${industryName}?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("industry_skills")
      .delete()
      .eq("industry_id", record.industry_id)
      .eq("skill_id", record.skill_id);

    if (error) {
      console.error(error);
      toast.error(error.message);
      return;
    }

    toast.success(
      "Skill demand mapping deleted successfully"
    );

    await fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Skill Demand Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage industry demand for individual skills
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
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Mappings
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {records.length}
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
              Skills
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {skills.length}
            </p>
          </div>
        </div>

        {/* Controls */}
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search industry or skill..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={
                    loading ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>

              <button
                onClick={openAddForm}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Demand
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">
                {editingRecord
                  ? "Edit Skill Demand"
                  : "Add Skill Demand"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define how strongly an industry demands a
                particular skill.
              </p>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-5"
            >
              {/* Industry */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Industry
                </label>

                <select
                  value={industryId}
                  onChange={(event) =>
                    setIndustryId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select industry
                  </option>

                  {industries.map((industry) => (
                    <option
                      key={industry.id}
                      value={industry.id}
                    >
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Skill
                </label>

                <select
                  value={skillId}
                  onChange={(event) =>
                    setSkillId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select skill
                  </option>

                  {skills.map((skill) => (
                    <option
                      key={skill.id}
                      value={skill.id}
                    >
                      {skill.name}
                      {skill.category
                        ? ` — ${skill.category}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Demand */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Industry Demand (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={demandPercentage}
                  onChange={(event) =>
                    setDemandPercentage(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 85"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Enter a value from 0 to 100.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingRecord
                    ? "Update Demand"
                    : "Add Demand"}
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

        {/* Records */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Industry Skill Demand
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Demand percentages used by SkillTrack analytics.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

              <p className="mt-4 text-sm text-slate-500">
                Loading skill demand...
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-700">
                No skill demand mappings found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a new mapping.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <div
                  key={`${record.industry_id}-${record.skill_id}`}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {record.skill?.name ??
                        `Skill ${record.skill_id}`}
                    </h3>

                    <p className="mt-1 text-sm text-blue-600">
                      {record.industry?.name ??
                        `Industry ${record.industry_id}`}
                    </p>

                    {record.skill?.category && (
                      <p className="mt-1 text-xs text-slate-400">
                        Category: {record.skill.category}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="min-w-24 text-center">
                      <p className="text-2xl font-bold text-slate-900">
                        {record.demand_percentage}%
                      </p>

                      <p className="text-xs text-slate-500">
                        Demand
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        openEditForm(record)
                      }
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(record)
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
    </div>
  );
}