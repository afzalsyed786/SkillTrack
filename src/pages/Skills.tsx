 import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Skill {
  id: number;
  name: string;
  category: string | null;
}

interface TraineeSkill {
  id: number;
  skill_id: number;
  proficiency: number;
  source: string;
  skills: {
    name: string;
    category: string | null;
  } | null;
}

const navigationItems = [
  {
    label: "Dashboard",
    path: "/trainee/dashboard",
  },
  {
    label: "Profile",
    path: "/trainee/profile",
  },
  {
    label: "Skills",
    path: "/trainee/skills",
  },
  {
    label: "Training",
    path: "/trainee/training",
  },
  {
    label: "Employment",
    path: "/trainee/employment",
  },
  {
    label: "Feedback",
    path: "/trainee/feedback",
  },
  {
    label: "Skill Gap",
    path: "/trainee/skill-gap",
  },
];

export default function Skills() {
  const { user, appUser, logout } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [traineeSkills, setTraineeSkills] = useState<
    TraineeSkill[]
  >([]);

  const [selectedSkill, setSelectedSkill] =
    useState("");
  const [proficiency, setProficiency] =
    useState("3");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: skillData,
        error: skillError,
      } = await supabase
        .from("skills")
        .select("id, name, category")
        .order("name");

      if (skillError) {
        console.error(
          "Skills loading error:",
          skillError
        );

        toast.error("Unable to load available skills.");
        return;
      }

      setSkills(skillData ?? []);

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

      const {
        data: traineeSkillData,
        error: traineeSkillError,
      } = await supabase
        .from("trainee_skills")
        .select(
          `
            id,
            skill_id,
            proficiency,
            source,
            skills (
              name,
              category
            )
          `
        )
        .eq("trainee_id", trainee.id)
        .order("created_at", {
          ascending: false,
        });

      if (traineeSkillError) {
        console.error(
          "Trainee skills loading error:",
          traineeSkillError
        );

        toast.error(
          "Unable to load your skills."
        );

        return;
      }

      setTraineeSkills(
        (traineeSkillData as unknown as TraineeSkill[]) ??
          []
      );
    } catch (error) {
      console.error(
        "Unexpected skills loading error:",
        error
      );

      toast.error(
        "Something went wrong while loading skills."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAddSkill = async () => {
    if (!user) {
      toast.error("You are not logged in.");
      return;
    }

    if (!selectedSkill) {
      toast.error("Please select a skill.");
      return;
    }

    const proficiencyValue =
      Number(proficiency);

    if (
      proficiencyValue < 1 ||
      proficiencyValue > 5
    ) {
      toast.error(
        "Please select a valid proficiency level."
      );
      return;
    }

    setSaving(true);

    try {
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

      const { error } = await supabase
        .from("trainee_skills")
        .insert({
          trainee_id: trainee.id,
          skill_id: Number(selectedSkill),
          proficiency: proficiencyValue,
          source: "SELF_REPORTED",
        });

      if (error) {
        if (error.code === "23505") {
          toast.error(
            "You have already added this skill."
          );
        } else {
          console.error(
            "Add skill error:",
            error
          );

          toast.error(error.message);
        }

        return;
      }

      toast.success(
        "Skill added successfully!"
      );

      setSelectedSkill("");
      setProficiency("3");

      await loadData();
    } catch (error) {
      console.error(
        "Unexpected add skill error:",
        error
      );

      toast.error(
        "Something went wrong while adding the skill."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (
    id: number
  ) => {
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from("trainee_skills")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "Delete skill error:",
          error
        );

        toast.error(
          "Unable to remove skill."
        );

        return;
      }

      toast.success("Skill removed.");

      await loadData();
    } catch (error) {
      console.error(
        "Unexpected delete skill error:",
        error
      );

      toast.error(
        "Something went wrong while removing the skill."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", {
      replace: true,
    });
  };

  const getProficiencyLabel = (
    value: number
  ) => {
    if (value === 1) return "Beginner";
    if (value === 2) return "Basic";
    if (value === 3) return "Intermediate";
    if (value === 4) return "Advanced";

    return "Expert";
  };

  const getProficiencyDescription = (
    value: number
  ) => {
    if (value === 1) {
      return "Just starting";
    }

    if (value === 2) {
      return "Basic understanding";
    }

    if (value === 3) {
      return "Can work independently";
    }

    if (value === 4) {
      return "Strong practical ability";
    }

    return "Highly skilled";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading skills...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* =========================
          HEADER
      ========================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-16 items-center justify-between gap-4">
            {/* Logo */}

            <button
              type="button"
              onClick={() =>
                navigate("/trainee/dashboard")
              }
              className="shrink-0 text-left"
            >
              <h1 className="text-xl font-bold text-blue-700 sm:text-2xl">
                SkillTrack
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Post-Training Skill Analytics
              </p>
            </button>

            {/* User */}

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
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
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation */}

          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-3 pt-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Page heading */}

        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Trainee Skills
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                Manage Your Skills
              </h2>

              <p className="mt-2 max-w-2xl text-slate-600">
                Add the technical and professional
                skills you have learned and rate
                your current proficiency.
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
              <p className="text-xs font-medium text-blue-600">
                Skills Added
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {traineeSkills.length}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            ADD SKILL CARD
        ========================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Add a New Skill
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose a skill and tell us how confident
              you are with it.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Skill */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Skill
              </label>

              <select
                value={selectedSkill}
                onChange={(e) =>
                  setSelectedSkill(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  Select a skill
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

            {/* Proficiency */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Proficiency Level
              </label>

              <select
                value={proficiency}
                onChange={(e) =>
                  setProficiency(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="1">
                  1 — Beginner
                </option>

                <option value="2">
                  2 — Basic
                </option>

                <option value="3">
                  3 — Intermediate
                </option>

                <option value="4">
                  4 — Advanced
                </option>

                <option value="5">
                  5 — Expert
                </option>
              </select>

              <p className="mt-2 text-xs text-slate-500">
                {getProficiencyDescription(
                  Number(proficiency)
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSkill}
            disabled={
              saving || !selectedSkill
            }
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Adding Skill..."
              : "Add Skill"}
          </button>
        </section>

        {/* =========================
            MY SKILLS
        ========================= */}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                My Skills
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your current skill profile
              </p>
            </div>
          </div>

          {traineeSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                🎯
              </div>

              <h4 className="mt-4 text-lg font-semibold text-slate-800">
                No skills added yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Add your skills above. SkillTrack will
                use them to calculate your skill gaps
                against industry demand.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {traineeSkills.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Skill title */}

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="truncate text-lg font-bold text-slate-900">
                        {item.skills?.name ??
                          "Unknown Skill"}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.skills?.category ??
                          "General"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteSkill(
                          item.id
                        )
                      }
                      disabled={
                        deletingId === item.id
                      }
                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === item.id
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>

                  {/* Proficiency */}

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">
                        Proficiency
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {getProficiencyLabel(
                          item.proficiency
                        )}
                      </span>
                    </div>

                    {/* Progress */}

                    <div className="mt-4 flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(
                        (level) => (
                          <div
                            key={level}
                            className={`h-2.5 flex-1 rounded-full transition ${
                              level <=
                              item.proficiency
                                ? "bg-blue-600"
                                : "bg-slate-200"
                            }`}
                          />
                        )
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Level{" "}
                        {item.proficiency} / 5
                      </span>

                      <span className="font-medium text-slate-600">
                        {item.proficiency * 20}%
                      </span>
                    </div>
                  </div>

                  {/* Source */}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">
                      Source:{" "}
                      {item.source ===
                      "ASSESSMENT"
                        ? "Assessment"
                        : "Self Reported"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================
            SKILL GAP INFORMATION
        ========================= */}

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Want to know what skills you are
                missing?
              </h3>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                SkillTrack compares your current
                proficiency with industry skill demand
                and identifies your highest-priority
                skill gaps.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/trainee/skill-gap"
                )
              }
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              View Skill Gap
            </button>
          </div>
        </section>
      </main>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6">
          SkillTrack — Post-Training Skill Gap
          Analytics Platform
        </div>
      </footer>
    </div>
  );
}