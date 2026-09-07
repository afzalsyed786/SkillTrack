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
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Industry {
  id: number;
  name: string;
}

interface JobRole {
  id: number;
  title: string;
  industry_id: number | null;
}

interface Employment {
  id: number;
  employment_status:
    | "EMPLOYED"
    | "SELF_EMPLOYED"
    | "UNEMPLOYED"
    | "HIGHER_STUDIES";
  company_name: string | null;
  salary: number | null;
  employment_date: string | null;
  job_role_id: number | null;
  industry_id: number | null;
  job_roles: {
    title: string;
  } | null;
  industries: {
    name: string;
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

export default function Employment() {
  const { user, appUser, logout } = useAuth();
  const navigate = useNavigate();

  const [industries, setIndustries] =
    useState<Industry[]>([]);

  const [jobRoles, setJobRoles] =
    useState<JobRole[]>([]);

  const [employment, setEmployment] =
    useState<Employment | null>(null);

  const [status, setStatus] =
    useState<
      Employment["employment_status"]
    >("EMPLOYED");

  const [companyName, setCompanyName] =
    useState("");

  const [industryId, setIndustryId] =
    useState("");

  const [jobRoleId, setJobRoleId] =
    useState("");

  const [salary, setSalary] =
    useState("");

  const [employmentDate, setEmploymentDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: industryData,
        error: industryError,
      } = await supabase
        .from("industries")
        .select("id, name")
        .order("name");

      if (industryError) {
        console.error(
          "Industry loading error:",
          industryError
        );

        toast.error(
          "Unable to load industries."
        );
      } else {
        setIndustries(
          industryData ?? []
        );
      }

      const {
        data: jobRoleData,
        error: jobRoleError,
      } = await supabase
        .from("job_roles")
        .select(
          "id, title, industry_id"
        )
        .order("title");

      if (jobRoleError) {
        console.error(
          "Job role loading error:",
          jobRoleError
        );

        toast.error(
          "Unable to load job roles."
        );
      } else {
        setJobRoles(
          jobRoleData ?? []
        );
      }

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
        data: employmentData,
        error: employmentError,
      } = await supabase
        .from("employment")
        .select(
          `
            id,
            employment_status,
            company_name,
            salary,
            employment_date,
            job_role_id,
            industry_id,
            job_roles (
              title
            ),
            industries (
              name
            )
          `
        )
        .eq("trainee_id", trainee.id)
        .maybeSingle();

      if (employmentError) {
        console.error(
          "Employment loading error:",
          employmentError
        );

        toast.error(
          "Unable to load employment information."
        );

        return;
      }

      if (employmentData) {
        const record =
          employmentData as unknown as Employment;

        setEmployment(record);

        setStatus(
          record.employment_status
        );

        setCompanyName(
          record.company_name ?? ""
        );

        setIndustryId(
          record.industry_id !== null
            ? String(record.industry_id)
            : ""
        );

        setJobRoleId(
          record.job_role_id !== null
            ? String(record.job_role_id)
            : ""
        );

        setSalary(
          record.salary !== null
            ? String(record.salary)
            : ""
        );

        setEmploymentDate(
          record.employment_date ?? ""
        );
      }
    } catch (error) {
      console.error(
        "Unexpected employment loading error:",
        error
      );

      toast.error(
        "Something went wrong while loading employment information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      toast.error("You are not logged in.");
      return;
    }

    if (
      status === "EMPLOYED" &&
      !companyName.trim()
    ) {
      toast.error(
        "Please enter your company name."
      );

      return;
    }

    if (
      salary &&
      (Number(salary) < 0 ||
        Number.isNaN(Number(salary)))
    ) {
      toast.error(
        "Please enter a valid salary."
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

      const payload = {
        trainee_id: trainee.id,
        employment_status: status,
        company_name:
          companyName.trim() || null,
        job_role_id:
          jobRoleId
            ? Number(jobRoleId)
            : null,
        industry_id:
          industryId
            ? Number(industryId)
            : null,
        salary:
          salary
            ? Number(salary)
            : null,
        employment_date:
          employmentDate || null,
        updated_at:
          new Date().toISOString(),
      };

      const {
        error,
      } = await supabase
        .from("employment")
        .upsert(payload, {
          onConflict: "trainee_id",
        });

      if (error) {
        console.error(
          "Employment save error:",
          error
        );

        toast.error(error.message);
        return;
      }

      toast.success(
        "Employment information saved successfully!"
      );

      await loadData();
    } catch (error) {
      console.error(
        "Unexpected employment save error:",
        error
      );

      toast.error(
        "Something went wrong while saving employment information."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!employment) return;

    setDeleting(true);

    try {
      const {
        error,
      } = await supabase
        .from("employment")
        .delete()
        .eq("id", employment.id);

      if (error) {
        console.error(
          "Employment delete error:",
          error
        );

        toast.error(
          "Unable to remove employment information."
        );

        return;
      }

      toast.success(
        "Employment information removed."
      );

      setEmployment(null);
      setStatus("EMPLOYED");
      setCompanyName("");
      setIndustryId("");
      setJobRoleId("");
      setSalary("");
      setEmploymentDate("");
    } catch (error) {
      console.error(
        "Unexpected employment delete error:",
        error
      );

      toast.error(
        "Something went wrong while removing employment information."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleIndustryChange = (
    value: string
  ) => {
    setIndustryId(value);
    setJobRoleId("");
  };

  const filteredJobRoles =
    jobRoles.filter(
      (role) =>
        !industryId ||
        role.industry_id ===
          Number(industryId)
    );

  const formatDate = (
    date: string | null
  ) => {
    if (!date) return "Not specified";

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

  const formatStatus = (
    value: Employment["employment_status"]
  ) => {
    if (value === "SELF_EMPLOYED") {
      return "Self Employed";
    }

    if (value === "HIGHER_STUDIES") {
      return "Higher Studies";
    }

    if (value === "UNEMPLOYED") {
      return "Unemployed";
    }

    return "Employed";
  };

  const getStatusStyle = (
    value: Employment["employment_status"]
  ) => {
    if (value === "EMPLOYED") {
      return "bg-green-100 text-green-700";
    }

    if (value === "SELF_EMPLOYED") {
      return "bg-blue-100 text-blue-700";
    }

    if (value === "HIGHER_STUDIES") {
      return "bg-purple-100 text-purple-700";
    }

    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading employment information...
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
                navigate(
                  "/trainee/dashboard"
                )
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
            {navigationItems.map(
              (item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({
                    isActive,
                  }) =>
                    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>
        </div>
      </header>

      {/* =========================
          MAIN
      ========================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">

        {/* Page heading */}

        <div className="mb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Career Tracking
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                Employment Information
              </h2>

              <p className="mt-2 max-w-2xl text-slate-600">
                Tell SkillTrack about your current
                career status after completing your
                training.
              </p>
            </div>

            <div
              className={`rounded-xl px-5 py-3 ${
                employment
                  ? "border border-green-100 bg-green-50"
                  : "border border-amber-100 bg-amber-50"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  employment
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                Career Status
              </p>

              <p
                className={`mt-1 font-bold ${
                  employment
                    ? "text-green-700"
                    : "text-amber-700"
                }`}
              >
                {employment
                  ? formatStatus(
                      employment.employment_status
                    )
                  : "Not Added"}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            FORM
        ========================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {employment
                ? "Update Employment Details"
                : "Add Employment Details"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your employment information helps
              SkillTrack measure post-training outcomes.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-6 md:grid-cols-2"
          >

            {/* Status */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Employment Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as Employment["employment_status"]
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="EMPLOYED">
                  Employed
                </option>

                <option value="SELF_EMPLOYED">
                  Self Employed
                </option>

                <option value="UNEMPLOYED">
                  Unemployed
                </option>

                <option value="HIGHER_STUDIES">
                  Higher Studies
                </option>
              </select>
            </div>

            {/* Company */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company Name
              </label>

              <input
                type="text"
                value={companyName}
                onChange={(e) =>
                  setCompanyName(
                    e.target.value
                  )
                }
                placeholder={
                  status === "SELF_EMPLOYED"
                    ? "Business / Freelance name"
                    : "e.g. TCS"
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              {status !== "EMPLOYED" && (
                <p className="mt-2 text-xs text-slate-500">
                  Optional for this employment status.
                </p>
              )}
            </div>

            {/* Industry */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Industry
              </label>

              <select
                value={industryId}
                onChange={(e) =>
                  handleIndustryChange(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  Select industry
                </option>

                {industries.map(
                  (industry) => (
                    <option
                      key={industry.id}
                      value={industry.id}
                    >
                      {industry.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Job Role */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Job Role
              </label>

              <select
                value={jobRoleId}
                onChange={(e) =>
                  setJobRoleId(
                    e.target.value
                  )
                }
                disabled={
                  saving ||
                  !industryId
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {industryId
                    ? "Select job role"
                    : "Select industry first"}
                </option>

                {filteredJobRoles.map(
                  (role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.title}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Salary */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Annual Salary
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  value={salary}
                  onChange={(e) =>
                    setSalary(
                      e.target.value
                    )
                  }
                  placeholder="Annual salary"
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pl-9 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Optional. Enter your annual salary in
                Indian Rupees.
              </p>
            </div>

            {/* Employment date */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Employment Date
              </label>

              <input
                type="date"
                value={employmentDate}
                onChange={(e) =>
                  setEmploymentDate(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Submit */}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving Information..."
                  : employment
                  ? "Update Employment Information"
                  : "Save Employment Information"}
              </button>
            </div>
          </form>
        </section>

        {/* =========================
            CURRENT EMPLOYMENT
        ========================= */}

        {employment && (
          <section className="mt-8">
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-900">
                Current Career Information
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                The employment information currently
                stored in your SkillTrack profile.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              {/* Header */}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-xl font-bold text-slate-900">
                      {employment.company_name ??
                        "No company specified"}
                    </h4>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                        employment.employment_status
                      )}`}
                    >
                      {formatStatus(
                        employment.employment_status
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {employment.job_roles
                      ?.title ??
                      "Job role not specified"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting
                    ? "Removing..."
                    : "Remove Information"}
                </button>
              </div>

              {/* Information grid */}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Industry
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {employment
                      .industries?.name ??
                      "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Job Role
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {employment
                      .job_roles?.title ??
                      "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Annual Salary
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {employment.salary !==
                    null
                      ? `₹${employment.salary.toLocaleString(
                          "en-IN"
                        )}`
                      : "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Employment Date
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(
                      employment.employment_date
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================
            SKILL GAP CTA
        ========================= */}

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                See how your skills compare with industry
                demand
              </h3>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Once your profile, skills, training and
                employment information are added, view
                your personalized skill-gap analysis.
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