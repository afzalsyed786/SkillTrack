import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Save,
  UserRound,
} from "lucide-react";

import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const navigationItems = [
  {
    label: "Dashboard",
    to: "/trainee/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Profile",
    to: "/trainee/profile",
    icon: UserRound,
  },
  {
    label: "Skills",
    to: "/trainee/skills",
    icon: UserRound,
  },
  {
    label: "Training",
    to: "/trainee/training",
    icon: UserRound,
  },
  {
    label: "Employment",
    to: "/trainee/employment",
    icon: UserRound,
  },
  {
    label: "Feedback",
    to: "/trainee/feedback",
    icon: UserRound,
  },
  {
    label: "Skill Gap",
    to: "/trainee/skill-gap",
    icon: UserRound,
  },
];

export default function Profile() {
  const {
    user,
    appUser,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [form, setForm] = useState({
    phone: "",
    date_of_birth: "",
    gender: "",
    city: "",
    state: "",
    education_level: "",
    institution: "",
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("trainees")
        .select(
          "phone, date_of_birth, gender, city, state, education_level, institution"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setForm({
          phone: data.phone ?? "",
          date_of_birth:
            data.date_of_birth ?? "",
          gender: data.gender ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          education_level:
            data.education_level ?? "",
          institution:
            data.institution ?? "",
        });
      }
    } catch (error) {
      console.error(
        "Profile loading error:",
        error
      );

      toast.error(
        "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const profileFields = useMemo(
    () => [
      form.phone,
      form.date_of_birth,
      form.gender,
      form.city,
      form.state,
      form.education_level,
      form.institution,
    ],
    [form]
  );

  const completedFields =
    profileFields.filter(
      (field) => field.trim() !== ""
    ).length;

  const profileCompletion =
    Math.round(
      (completedFields /
        profileFields.length) *
        100
    );

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      toast.error(
        "You are not logged in."
      );
      return;
    }

    if (
      form.phone.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(
        form.phone.trim()
      )
    ) {
      toast.error(
        "Please enter a valid phone number."
      );
      return;
    }

    setSaving(true);

    try {
      const profileData = {
        user_id: user.id,

        phone:
          form.phone.trim() || null,

        date_of_birth:
          form.date_of_birth || null,

        gender:
          form.gender || null,

        city:
          form.city.trim() || null,

        state:
          form.state.trim() || null,

        education_level:
          form.education_level || null,

        institution:
          form.institution.trim() || null,

        updated_at:
          new Date().toISOString(),
      };

      const {
        error,
      } = await supabase
        .from("trainees")
        .upsert(profileData, {
          onConflict: "user_id",
        });

      if (error) {
        throw error;
      }

      toast.success(
        "Profile saved successfully!"
      );
    } catch (error) {
      console.error(
        "Profile save error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await logout();

      toast.success(
        "Logged out successfully."
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      toast.error(
        "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 font-medium text-slate-600">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-16 items-center justify-between gap-4">

            {/* Logo */}

            <Link
              to="/trainee/dashboard"
              className="flex shrink-0 items-center gap-3"
            >
              <div className="rounded-xl bg-blue-600 p-2 text-white">
                <LayoutDashboard
                  size={21}
                />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  SkillTrack
                </h1>

                <p className="hidden text-xs text-slate-500 sm:block">
                  Trainee Portal
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}

            <nav className="hidden items-center gap-1 xl:flex">
              {navigationItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={
                        item.to ===
                        "/trainee/dashboard"
                      }
                      className={({
                        isActive,
                      }) =>
                        `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      <Icon size={16} />

                      {item.label}
                    </NavLink>
                  );
                }
              )}
            </nav>

            {/* User */}

            <div className="flex items-center gap-3">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-semibold text-slate-900">
                  {appUser?.full_name ??
                    "Trainee"}
                </p>

                <p className="text-xs text-slate-500">
                  {appUser?.email ??
                    user?.email}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                {(
                  appUser?.full_name ??
                  "T"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={17} />

                <span className="hidden sm:inline">
                  {loggingOut
                    ? "Logging out..."
                    : "Logout"}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}

          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 py-2 xl:hidden">
            {navigationItems.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={
                      item.to ===
                      "/trainee/dashboard"
                    }
                    className={({
                      isActive,
                    }) =>
                      `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`
                    }
                  >
                    <Icon size={15} />

                    {item.label}
                  </NavLink>
                );
              }
            )}
          </nav>
        </div>
      </header>

      {/* ============================================================
          MAIN
      ============================================================ */}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Back */}

        <Link
          to="/trainee/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </Link>

        {/* Page Header */}

        <section className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">

            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3">
                  <UserRound size={25} />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Trainee Profile
                  </p>

                  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Complete Your Profile
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">
                Keep your personal and
                educational information
                updated so SkillTrack can
                provide more useful analytics.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 text-center backdrop-blur">
              <p className="text-sm text-blue-100">
                Profile Completion
              </p>

              <p className="mt-1 text-4xl font-bold">
                {profileCompletion}%
              </p>
            </div>
          </div>
        </section>

        {/* Completion */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Profile Progress
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {completedFields} of{" "}
                {profileFields.length}{" "}
                profile fields completed
              </p>
            </div>

            {profileCompletion ===
              100 && (
              <CheckCircle2
                className="text-emerald-600"
                size={24}
              />
            )}
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${profileCompletion}%`,
              }}
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {profileCompletion ===
            100
              ? "Your profile is complete."
              : "Complete more fields to improve your SkillTrack analytics."}
          </p>
        </section>

        {/* ============================================================
            FORM
        ============================================================ */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Personal & Educational Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter accurate information about
              yourself and your education.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7"
          >
            <div className="grid gap-6 md:grid-cols-2">

              {/* Phone */}

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* DOB */}

              <div>
                <label
                  htmlFor="date_of_birth"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Date of Birth
                </label>

                <input
                  id="date_of_birth"
                  type="date"
                  name="date_of_birth"
                  value={
                    form.date_of_birth
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Gender */}

              <div>
                <label
                  htmlFor="gender"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Gender
                </label>

                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                  <option value="Prefer not to say">
                    Prefer not to say
                  </option>
                </select>
              </div>

              {/* City */}

              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  City
                </label>

                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  autoComplete="address-level2"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* State */}

              <div>
                <label
                  htmlFor="state"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  State
                </label>

                <input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  autoComplete="address-level1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {/* Education */}

              <div>
                <label
                  htmlFor="education_level"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Education Level
                </label>

                <select
                  id="education_level"
                  name="education_level"
                  value={
                    form.education_level
                  }
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">
                    Select education level
                  </option>

                  <option value="10th">
                    10th
                  </option>

                  <option value="12th">
                    12th
                  </option>

                  <option value="Diploma">
                    Diploma
                  </option>

                  <option value="Undergraduate">
                    Undergraduate
                  </option>

                  <option value="Postgraduate">
                    Postgraduate
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* Institution */}

              <div className="md:col-span-2">
                <label
                  htmlFor="institution"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Institution
                </label>

                <input
                  id="institution"
                  name="institution"
                  value={
                    form.institution
                  }
                  onChange={handleChange}
                  placeholder="College / University / Institution"
                  autoComplete="organization"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Actions */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/trainee/dashboard"
                  )
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />

                {saving
                  ? "Saving..."
                  : "Save Profile"}
              </button>
            </div>
          </form>
        </section>

        {/* ============================================================
            INFORMATION CARD
        ============================================================ */}

        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-blue-600"
              size={21}
            />

            <div>
              <h3 className="font-bold text-slate-900">
                Why complete your profile?
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your profile information helps
                SkillTrack understand trainee
                backgrounds and improves the
                quality of post-training career
                analytics.
              </p>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          SkillTrack • Post-Training Skill Gap
          Analytics Platform
        </footer>
      </main>
    </div>
  );
}