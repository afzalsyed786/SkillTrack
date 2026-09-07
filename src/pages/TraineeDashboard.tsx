import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Trainee {
  id: number;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  education_level: string | null;
  institution: string | null;
}

interface TraineeSkill {
  skill_id: number;
  proficiency: number;
  skill_name: string;
}

interface Training {
  id: number;
  status: "ONGOING" | "COMPLETED" | "DROPPED";
  course_id: number;
  course_name: string;
}

interface Employment {
  employment_status:
    | "EMPLOYED"
    | "SELF_EMPLOYED"
    | "UNEMPLOYED"
    | "HIGHER_STUDIES";
}

interface Feedback {
  training_rating: number | null;
  usefulness_rating: number | null;
  recommendation_rating: number | null;
}

interface IndustrySkill {
  skill_id: number;
  demand_percentage: number;
  skill_name: string;
}

interface SkillAnalytics {
  skill: string;
  availability: number;
  demand: number;
  gap: number;
}

const chartHeight = 320;

function DashboardCard({
  icon,
  title,
  value,
  description,
  iconClass = "bg-blue-100 text-blue-700",
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  description: string;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
        {icon}
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

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
    icon: Target,
  },
  {
    label: "Training",
    to: "/trainee/training",
    icon: GraduationCap,
  },
  {
    label: "Employment",
    to: "/trainee/employment",
    icon: BriefcaseBusiness,
  },
  {
    label: "Feedback",
    to: "/trainee/feedback",
    icon: MessageSquare,
  },
  {
    label: "Skill Gap",
    to: "/trainee/skill-gap",
    icon: Activity,
  },
];

export default function TraineeDashboard() {
  const { user, appUser, logout } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const [trainee, setTrainee] =
    useState<Trainee | null>(null);

  const [skills, setSkills] =
    useState<TraineeSkill[]>([]);

  const [trainings, setTrainings] =
    useState<Training[]>([]);

  const [employment, setEmployment] =
    useState<Employment | null>(null);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const [industrySkills, setIndustrySkills] =
    useState<IndustrySkill[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [user]);

  async function loadDashboard() {
    if (!user) return;

    try {
      setLoading(true);
      setError("");

      // ============================================================
      // 1. TRAINEE PROFILE
      // ============================================================

      const {
        data: traineeData,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (traineeError) {
        throw traineeError;
      }

      setTrainee(traineeData);

      if (!traineeData) {
        setSkills([]);
        setTrainings([]);
        setEmployment(null);
        setFeedback(null);
        setIndustrySkills([]);
        return;
      }

      const traineeId = traineeData.id;

      // ============================================================
      // 2. TRAINEE SKILLS
      // ============================================================

      const {
        data: skillRows,
        error: skillsError,
      } = await supabase
        .from("trainee_skills")
        .select("skill_id, proficiency")
        .eq("trainee_id", traineeId);

      if (skillsError) {
        throw skillsError;
      }

      const skillIds = (skillRows ?? []).map(
        (item) => item.skill_id
      );

      let skillNames: Record<number, string> = {};

      if (skillIds.length > 0) {
        const {
          data: skillData,
          error: skillDataError,
        } = await supabase
          .from("skills")
          .select("id, name")
          .in("id", skillIds);

        if (skillDataError) {
          throw skillDataError;
        }

        skillNames = Object.fromEntries(
          (skillData ?? []).map((skill) => [
            skill.id,
            skill.name,
          ])
        );
      }

      setSkills(
        (skillRows ?? []).map((item) => ({
          skill_id: item.skill_id,
          proficiency: Number(item.proficiency),
          skill_name:
            skillNames[item.skill_id] ??
            "Unknown Skill",
        }))
      );

      // ============================================================
      // 3. TRAININGS
      // ============================================================

      const {
        data: trainingRows,
        error: trainingError,
      } = await supabase
        .from("trainings")
        .select("id, status, course_id")
        .eq("trainee_id", traineeId)
        .order("created_at", {
          ascending: false,
        });

      if (trainingError) {
        throw trainingError;
      }

      const courseIds = (trainingRows ?? []).map(
        (item) => item.course_id
      );

      let courseNames: Record<number, string> = {};

      if (courseIds.length > 0) {
        const {
          data: courseData,
          error: courseError,
        } = await supabase
          .from("courses")
          .select("id, name")
          .in("id", courseIds);

        if (courseError) {
          throw courseError;
        }

        courseNames = Object.fromEntries(
          (courseData ?? []).map((course) => [
            course.id,
            course.name,
          ])
        );
      }

      setTrainings(
        (trainingRows ?? []).map((item) => ({
          id: item.id,
          status: item.status as
            | "ONGOING"
            | "COMPLETED"
            | "DROPPED",
          course_id: item.course_id,
          course_name:
            courseNames[item.course_id] ??
            "Unknown Course",
        }))
      );

      // ============================================================
      // 4. EMPLOYMENT
      // ============================================================

      const {
        data: employmentData,
        error: employmentError,
      } = await supabase
        .from("employment")
        .select("employment_status")
        .eq("trainee_id", traineeId)
        .maybeSingle();

      if (employmentError) {
        throw employmentError;
      }

      setEmployment(
        employmentData
          ? {
              employment_status:
                employmentData.employment_status as
                  | "EMPLOYED"
                  | "SELF_EMPLOYED"
                  | "UNEMPLOYED"
                  | "HIGHER_STUDIES",
            }
          : null
      );

      // ============================================================
      // 5. FEEDBACK
      // ============================================================

      const {
        data: feedbackData,
        error: feedbackError,
      } = await supabase
        .from("feedback")
        .select(
          "training_rating, usefulness_rating, recommendation_rating"
        )
        .eq("trainee_id", traineeId)
        .maybeSingle();

      if (feedbackError) {
        throw feedbackError;
      }

      setFeedback(feedbackData);

      // ============================================================
      // 6. INDUSTRY DEMAND
      // ============================================================

      const {
        data: industryData,
        error: industryError,
      } = await supabase
        .from("industries")
        .select("id")
        .eq(
          "name",
          "Data Science and Analytics"
        )
        .maybeSingle();

      if (industryError) {
        throw industryError;
      }

      if (industryData) {
        const {
          data: industrySkillRows,
          error: industrySkillError,
        } = await supabase
          .from("industry_skills")
          .select(
            "skill_id, demand_percentage"
          )
          .eq(
            "industry_id",
            industryData.id
          );

        if (industrySkillError) {
          throw industrySkillError;
        }

        const demandSkillIds =
          (industrySkillRows ?? []).map(
            (item) => item.skill_id
          );

        let demandNames: Record<number, string> =
          {};

        if (demandSkillIds.length > 0) {
          const {
            data: demandSkills,
            error: demandSkillsError,
          } = await supabase
            .from("skills")
            .select("id, name")
            .in(
              "id",
              demandSkillIds
            );

          if (demandSkillsError) {
            throw demandSkillsError;
          }

          demandNames = Object.fromEntries(
            (demandSkills ?? []).map(
              (skill) => [
                skill.id,
                skill.name,
              ]
            )
          );
        }

        setIndustrySkills(
          (industrySkillRows ?? []).map(
            (item) => ({
              skill_id: item.skill_id,
              demand_percentage: Number(
                item.demand_percentage
              ),
              skill_name:
                demandNames[item.skill_id] ??
                "Unknown Skill",
            })
          )
        );
      } else {
        setIndustrySkills([]);
      }
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    if (!user) return;

    setRefreshing(true);

    await loadDashboard();

    toast.success("Dashboard refreshed.");
  }

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await logout();

      toast.success("Logged out successfully.");

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Logout error:",
        err
      );

      toast.error(
        "Unable to log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  // ============================================================
  // PROFILE COMPLETION
  // ============================================================

  const profileCompletion = useMemo(() => {
    if (!trainee) return 0;

    const fields = [
      trainee.phone,
      trainee.date_of_birth,
      trainee.gender,
      trainee.city,
      trainee.state,
      trainee.education_level,
      trainee.institution,
    ];

    const completed = fields.filter(
      (field) =>
        field !== null &&
        field !== ""
    ).length;

    return Math.round(
      (completed / fields.length) * 100
    );
  }, [trainee]);

  // ============================================================
  // TRAINING STATS
  // ============================================================

  const completedTrainings =
    trainings.filter(
      (training) =>
        training.status === "COMPLETED"
    ).length;

  const ongoingTrainings =
    trainings.filter(
      (training) =>
        training.status === "ONGOING"
    ).length;

  const droppedTrainings =
    trainings.filter(
      (training) =>
        training.status === "DROPPED"
    ).length;

  const trainingChartData = [
    {
      name: "Completed",
      value: completedTrainings,
    },
    {
      name: "Ongoing",
      value: ongoingTrainings,
    },
    {
      name: "Dropped",
      value: droppedTrainings,
    },
  ].filter(
    (item) => item.value > 0
  );

  // ============================================================
  // EMPLOYMENT
  // ============================================================

  const employmentLabel =
    employment?.employment_status
      ? employment.employment_status
          .replace(/_/g, " ")
          .replace(
            /\b\w/g,
            (letter) =>
              letter.toUpperCase()
          )
      : "Not Updated";

  // ============================================================
  // FEEDBACK AVERAGE
  // ============================================================

  const feedbackAverage = useMemo(() => {
    if (!feedback) {
      return "—";
    }

    const ratings = [
      feedback.training_rating,
      feedback.usefulness_rating,
      feedback.recommendation_rating,
    ].filter(
      (value): value is number =>
        value !== null
    );

    if (ratings.length === 0) {
      return "—";
    }

    const average =
      ratings.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / ratings.length;

    return average.toFixed(1);
  }, [feedback]);

  // ============================================================
  // SKILL ANALYTICS
  // ============================================================

  const skillAnalytics =
    useMemo<SkillAnalytics[]>(() => {
      const traineeMap =
        new Map<number, number>();

      skills.forEach((skill) => {
        traineeMap.set(
          skill.skill_id,
          skill.proficiency * 20
        );
      });

      return industrySkills
        .map((industrySkill) => {
          const availability =
            traineeMap.get(
              industrySkill.skill_id
            ) ?? 0;

          const demand =
            industrySkill.demand_percentage;

          return {
            skill:
              industrySkill.skill_name,
            availability,
            demand,
            gap: Math.max(
              0,
              demand - availability
            ),
          };
        })
        .sort(
          (a, b) =>
            b.gap - a.gap
        );
    }, [skills, industrySkills]);

  const topSkillAnalytics =
    skillAnalytics.slice(0, 8);

  const averageSkillLevel =
    skills.length > 0
      ? Math.round(
          skills.reduce(
            (sum, skill) =>
              sum +
              skill.proficiency,
            0
          ) / skills.length
        )
      : 0;

  const averageSkillPercentage =
    averageSkillLevel * 20;

  const totalSkillGaps =
    skillAnalytics.filter(
      (skill) => skill.gap > 0
    ).length;

  const criticalGaps =
    skillAnalytics.filter(
      (skill) => skill.gap > 40
    ).length;

  // ============================================================
  // QUICK ACTIONS
  // ============================================================

  const quickActions = [
    {
      title: "Complete Profile",
      description:
        "Keep your personal information updated.",
      icon: UserRound,
      to: "/trainee/profile",
      iconClass:
        "bg-blue-100 text-blue-700",
    },
    {
      title: "Manage Skills",
      description:
        "Add skills and update proficiency levels.",
      icon: Target,
      to: "/trainee/skills",
      iconClass:
        "bg-purple-100 text-purple-700",
    },
    {
      title: "Training History",
      description:
        "Record your completed and ongoing courses.",
      icon: GraduationCap,
      to: "/trainee/training",
      iconClass:
        "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Employment",
      description:
        "Update your current career status.",
      icon: BriefcaseBusiness,
      to: "/trainee/employment",
      iconClass:
        "bg-orange-100 text-orange-700",
    },
    {
      title: "Give Feedback",
      description:
        "Share your post-training experience.",
      icon: MessageSquare,
      to: "/trainee/feedback",
      iconClass:
        "bg-pink-100 text-pink-700",
    },
    {
      title: "Skill Gap Analysis",
      description:
        "Discover which skills you should improve.",
      icon: Activity,
      to: "/trainee/skill-gap",
      iconClass:
        "bg-red-100 text-red-700",
    },
  ];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 font-medium text-slate-600">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <AlertTriangle
            className="mx-auto text-red-600"
            size={42}
          />

          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            Dashboard Error
          </h2>

          <p className="mt-3 text-sm text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </button>
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
                <LayoutDashboard size={21} />
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
                      className={( {
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

            {/* User + Logout */}

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
                    className={( {
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

        {/* WELCOME */}

        <section className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-lg sm:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-medium text-blue-100">
                Welcome back
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                {appUser?.full_name ??
                  "Trainee"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Track your skills, training
                progress and career journey.
                Use SkillTrack to understand
                where your skills stand
                compared with industry demand.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh
              </button>

              {/* ONLY THIS BUTTON WAS CHANGED */}

              <Link
                to="/trainee/skill-gap"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                style={{
                  color: "#1d4ed8",
                  WebkitTextFillColor: "#1d4ed8",
                }}
              >
                <Target
                  size={19}
                  style={{
                    color: "#1d4ed8",
                    stroke: "#1d4ed8",
                  }}
                />

                <span
                  style={{
                    color: "#1d4ed8",
                    WebkitTextFillColor: "#1d4ed8",
                    opacity: 1,
                    visibility: "visible",
                  }}
                >
                  Analyze Skill Gap
                </span>

                <ChevronRight
                  size={18}
                  style={{
                    color: "#1d4ed8",
                    stroke: "#1d4ed8",
                  }}
                />
              </Link>
            </div>
          </div>
        </section>

        {/* STAT CARDS */}

        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            icon={<Target size={22} />}
            title="Skills Added"
            value={skills.length}
            description="Skills in your profile"
            iconClass="bg-blue-100 text-blue-700"
          />

          <DashboardCard
            icon={
              <GraduationCap size={22} />
            }
            title="Trainings"
            value={trainings.length}
            description={`${completedTrainings} completed`}
            iconClass="bg-emerald-100 text-emerald-700"
          />

          <DashboardCard
            icon={
              <AlertTriangle size={22} />
            }
            title="Skill Gaps"
            value={totalSkillGaps}
            description={`${criticalGaps} critical gaps`}
            iconClass="bg-red-100 text-red-700"
          />

          <DashboardCard
            icon={<UserRound size={22} />}
            title="Profile"
            value={`${profileCompletion}%`}
            description="Profile completion"
            iconClass="bg-purple-100 text-purple-700"
          />
        </section>

        {/* VISUAL ANALYTICS */}

        <section className="mt-8">
          <SectionTitle
            icon={
              <TrendingUp size={21} />
            }
            title="Skill Analytics"
            description="See how your current skills compare with industry demand."
          />

          <div className="grid gap-6 lg:grid-cols-2">

            {/* Skill Proficiency */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  My Skill Proficiency
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your self-reported
                  proficiency converted
                  to a percentage.
                </p>
              </div>

              {skills.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-center">
                  <div>
                    <Target
                      className="mx-auto text-slate-300"
                      size={42}
                    />

                    <p className="mt-3 font-semibold text-slate-700">
                      No skills added yet
                    </p>

                    <Link
                      to="/trainee/skills"
                      className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Add your skills
                    </Link>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={chartHeight}
                >
                  <BarChart
                    data={skills
                      .slice(0, 8)
                      .map(
                        (skill) => ({
                          name:
                            skill.skill_name,
                          proficiency:
                            skill.proficiency *
                            20,
                        })
                      )}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(
                        value
                      ) =>
                        `${value}%`
                      }
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      formatter={(
                        value
                      ) => [
                        `${value}%`,
                        "Proficiency",
                      ]}
                    />

                    <Bar
                      dataKey="proficiency"
                      fill="#2563eb"
                      radius={[
                        0,
                        6,
                        6,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Industry Demand */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Industry Demand vs Your Availability
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Data Science and
                  Analytics industry
                  benchmark.
                </p>
              </div>

              {topSkillAnalytics.length ===
              0 ? (
                <div className="flex h-[320px] items-center justify-center text-center">
                  <div>
                    <TrendingUp
                      className="mx-auto text-slate-300"
                      size={42}
                    />

                    <p className="mt-3 font-semibold text-slate-700">
                      Industry data
                      unavailable
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={chartHeight}
                >
                  <BarChart
                    data={
                      topSkillAnalytics
                    }
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(
                        value
                      ) =>
                        `${value}%`
                      }
                    />

                    <YAxis
                      type="category"
                      dataKey="skill"
                      width={105}
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip
                      formatter={(
                        value,
                        name
                      ) => [
                        `${value}%`,
                        name === "demand"
                          ? "Industry Demand"
                          : "Your Availability",
                      ]}
                    />

                    <Legend />

                    <Bar
                      dataKey="demand"
                      fill="#7c3aed"
                      name="Industry Demand"
                      radius={[
                        0,
                        5,
                        5,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="availability"
                      fill="#2563eb"
                      name="Your Availability"
                      radius={[
                        0,
                        5,
                        5,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* GAP CHART + TRAINING CHART */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Skill Gap */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Biggest Skill Gaps
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Skills with the largest
                  difference from industry
                  demand.
                </p>
              </div>

              <AlertTriangle
                className="text-red-500"
                size={22}
              />
            </div>

            {topSkillAnalytics.length ===
            0 ? (
              <div className="flex h-[300px] items-center justify-center text-center text-sm text-slate-500">
                No skill-gap data
                available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <BarChart
                  data={topSkillAnalytics.slice(
                    0,
                    6
                  )}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(
                      value
                    ) =>
                      `${value}%`
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={105}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) => [
                      `${value}%`,
                      "Skill Gap",
                    ]}
                  />

                  <Bar
                    dataKey="gap"
                    fill="#dc2626"
                    radius={[
                      0,
                      6,
                      6,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Training Progress */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Training Progress
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Overview of your training
                completion status.
              </p>
            </div>

            {trainingChartData.length ===
            0 ? (
              <div className="flex h-[300px] items-center justify-center text-center">
                <div>
                  <GraduationCap
                    className="mx-auto text-slate-300"
                    size={42}
                  />

                  <p className="mt-3 font-semibold text-slate-700">
                    No training records
                    yet
                  </p>

                  <Link
                    to="/trainee/training"
                    className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Add training
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer
                  width="100%"
                  height={250}
                >
                  <PieChart>
                    <Pie
                      data={
                        trainingChartData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({
                        name,
                        percent,
                      }) =>
                        `${name} ${(
                          (percent ?? 0) *
                          100
                        ).toFixed(0)}%`
                      }
                    >
                      {trainingChartData.map(
                        (_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              [
                                "#16a34a",
                                "#2563eb",
                                "#dc2626",
                              ][
                                index % 3
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-2 grid w-full grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">
                      {completedTrainings}
                    </p>

                    <p className="text-xs text-emerald-700">
                      Completed
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">
                      {ongoingTrainings}
                    </p>

                    <p className="text-xs text-blue-700">
                      Ongoing
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3 text-center">
                    <p className="text-xl font-bold text-red-700">
                      {droppedTrainings}
                    </p>

                    <p className="text-xs text-red-700">
                      Dropped
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CAREER SUMMARY */}

        <section className="mt-8">
          <SectionTitle
            icon={
              <BriefcaseBusiness size={21} />
            }
            title="Career Snapshot"
            description="A quick view of your current training and employment journey."
          />

          <div className="grid gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
                  <BriefcaseBusiness
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Employment Status
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {employmentLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                  <Activity size={22} />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Average Skill Level
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {averageSkillLevel >
                    0
                      ? `${averageSkillLevel}/5`
                      : "Not Available"}
                  </p>

                  {averageSkillLevel >
                    0 && (
                    <p className="text-xs text-slate-500">
                      Approximately{" "}
                      {
                        averageSkillPercentage
                      }
                      %
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-pink-100 p-3 text-pink-700">
                  <MessageSquare
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Feedback Rating
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {feedbackAverage !==
                    "—"
                      ? `${feedbackAverage}/5`
                      : "Not Submitted"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROFILE + TRAINING */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Profile Completion */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Profile Completion
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Complete your profile to
                  improve analytics.
                </p>
              </div>

              <span className="text-2xl font-bold text-blue-600">
                {profileCompletion}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${profileCompletion}%`,
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {profileCompletion ===
                100
                  ? "Profile complete"
                  : "Keep going"}
              </span>

              <Link
                to="/trainee/profile"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Update Profile
              </Link>
            </div>
          </div>

          {/* Training Overview */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Training Overview
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your current course
                  activity.
                </p>
              </div>

              <Clock3
                className="text-blue-600"
                size={22}
              />
            </div>

            <div className="mt-5 space-y-3">
              {trainings.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  No training records
                  added yet.
                </p>
              ) : (
                trainings
                  .slice(0, 3)
                  .map(
                    (training) => (
                      <div
                        key={
                          training.id
                        }
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                            <BookOpen
                              size={18}
                            />
                          </div>

                          <p className="truncate text-sm font-semibold text-slate-800">
                            {
                              training.course_name
                            }
                          </p>
                        </div>

                        <span
                          className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            training.status ===
                            "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : training.status ===
                                  "ONGOING"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {
                            training.status
                          }
                        </span>
                      </div>
                    )
                  )
              )}
            </div>

            <Link
              to="/trainee/training"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
            >
              View all training

              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-8">
          <SectionTitle
            icon={<Users size={21} />}
            title="Quick Actions"
            description="Manage the important parts of your SkillTrack profile."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map(
              (action) => {
                const Icon =
                  action.icon;

                return (
                  <Link
                    key={action.title}
                    to={action.to}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`rounded-xl p-3 ${action.iconClass}`}
                      >
                        <Icon size={22} />
                      </div>

                      <ChevronRight
                        size={19}
                        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                      />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-900">
                      {action.title}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {
                        action.description
                      }
                    </p>
                  </Link>
                );
              }
            )}
          </div>
        </section>

        {/* SKILL GAP CTA */}

        <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-100 p-3 text-red-700">
                <Award size={25} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Ready to improve your career readiness?
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  View your detailed skill
                  gaps and discover which
                  skills and courses can
                  help you become more
                  aligned with current
                  industry requirements.
                </p>
              </div>
            </div>

            <Link
              to="/trainee/skill-gap"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              View Skill Gap Analysis

              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="py-8 text-center text-xs text-slate-400">
          SkillTrack • Post-Training
          Skill Gap Analytics Platform
        </footer>
      </main>
    </div>
  );
}