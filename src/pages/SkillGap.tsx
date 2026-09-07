import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ElementType } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Target,
  TrendingUp,
  UserCircle,
  Wrench,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface Industry {
  id: number;
  name: string;
  description: string | null;
}

interface TraineeSkill {
  skill_id: number;
  proficiency: number;
  skill: {
    name: string;
    category: string | null;
  } | null;
}

interface IndustrySkill {
  skill_id: number;
  demand_percentage: number;
  skill: {
    name: string;
    category: string | null;
  } | null;
}

interface CourseSkill {
  course_id: number;
  skill_id: number;
  importance: number;
  course: {
    name: string;
    provider: string | null;
    duration_months: number | null;
  } | null;
}

interface GapResult {
  skillId: number;
  skillName: string;
  category: string;
  demand: number;
  availability: number;
  gap: number;
  priority:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
}

interface Recommendation {
  courseId: number;
  name: string;
  provider: string;
  duration: number | null;
  matchedSkills: string[];
  score: number;
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

export default function SkillGap() {
  const {
    user,
    appUser,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [industries, setIndustries] =
    useState<Industry[]>([]);

  const [selectedIndustry, setSelectedIndustry] =
    useState<number | null>(null);

  const [traineeSkills, setTraineeSkills] =
    useState<TraineeSkill[]>([]);

  const [industrySkills, setIndustrySkills] =
    useState<IndustrySkill[]>([]);

  const [courseSkills, setCourseSkills] =
    useState<CourseSkill[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
   * ---------------------------------------------------------
   * LOAD INITIAL DATA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    try {
      /*
       * INDUSTRIES
       */

      const {
        data: industryData,
        error: industryError,
      } = await supabase
        .from("industries")
        .select(
          "id, name, description"
        )
        .order("name");

      if (industryError) {
        throw industryError;
      }

      const availableIndustries =
        industryData ?? [];

      setIndustries(
        availableIndustries
      );

      if (
        availableIndustries.length > 0
      ) {
        setSelectedIndustry(
          availableIndustries[0].id
        );
      }

      /*
       * TRAINEE
       */

      const {
        data: trainee,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (traineeError) {
        throw traineeError;
      }

      if (!trainee) {
        setErrorMessage(
          "Please complete your profile before using Skill Gap Analytics."
        );

        setLoading(false);
        return;
      }

      /*
       * TRAINEE SKILLS
       */

      const {
        data: skillData,
        error: skillError,
      } = await supabase
        .from("trainee_skills")
        .select(
          `
            skill_id,
            proficiency,
            skills (
              name,
              category
            )
          `
        )
        .eq(
          "trainee_id",
          trainee.id
        );

      if (skillError) {
        throw skillError;
      }

      const formattedSkills: TraineeSkill[] =
        (skillData ?? []).map(
          (item: any) => ({
            skill_id: item.skill_id,
            proficiency:
              Number(
                item.proficiency
              ),
            skill:
              Array.isArray(
                item.skills
              )
                ? item.skills[0] ?? null
                : item.skills ?? null,
          })
        );

      setTraineeSkills(
        formattedSkills
      );

      /*
       * COURSE-SKILL MAPPINGS
       */

      const {
        data: courseData,
        error: courseError,
      } = await supabase
        .from("course_skills")
        .select(
          `
            course_id,
            skill_id,
            importance,
            courses (
              name,
              provider,
              duration_months
            )
          `
        );

      if (courseError) {
        throw courseError;
      }

      const formattedCourses: CourseSkill[] =
        (courseData ?? []).map(
          (item: any) => ({
            course_id:
              item.course_id,
            skill_id:
              item.skill_id,
            importance:
              Number(
                item.importance ?? 0
              ),
            course:
              Array.isArray(
                item.courses
              )
                ? item.courses[0] ?? null
                : item.courses ?? null,
          })
        );

      setCourseSkills(
        formattedCourses
      );
    } catch (error) {
      console.error(
        "Skill gap loading error:",
        error
      );

      setErrorMessage(
        "Unable to load Skill Gap Analytics."
      );

      toast.error(
        "Unable to load skill gap data."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD INDUSTRY DEMAND
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedIndustry) {
      setIndustrySkills([]);
      return;
    }

    loadIndustrySkills(
      selectedIndustry
    );
  }, [selectedIndustry]);

  const loadIndustrySkills = async (
    industryId: number
  ) => {
    setAnalyzing(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("industry_skills")
        .select(
          `
            skill_id,
            demand_percentage,
            skills (
              name,
              category
            )
          `
        )
        .eq(
          "industry_id",
          industryId
        );

      if (error) {
        throw error;
      }

      const formatted: IndustrySkill[] =
        (data ?? []).map(
          (item: any) => ({
            skill_id:
              item.skill_id,
            demand_percentage:
              Number(
                item.demand_percentage
              ),
            skill:
              Array.isArray(
                item.skills
              )
                ? item.skills[0] ?? null
                : item.skills ?? null,
          })
        );

      setIndustrySkills(
        formatted
      );
    } catch (error) {
      console.error(
        "Industry skill loading error:",
        error
      );

      setIndustrySkills([]);

      toast.error(
        "Unable to load industry skill demand."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  /*
   * ---------------------------------------------------------
   * GAP CALCULATION
   * ---------------------------------------------------------
   */

  const gapResults = useMemo<GapResult[]>(
    () => {
      return industrySkills
        .map((industrySkill) => {
          const traineeSkill =
            traineeSkills.find(
              (skill) =>
                skill.skill_id ===
                industrySkill.skill_id
            );

          /*
           * Proficiency 1–5 is converted
           * into 20–100% availability.
           */
          const availability =
            traineeSkill
              ? traineeSkill.proficiency *
                20
              : 0;

          const demand = Number(
            industrySkill.demand_percentage
          );

          const gap = Math.max(
            0,
            demand - availability
          );

          let priority: GapResult["priority"] =
            "Low";

          if (gap > 40) {
            priority = "Critical";
          } else if (gap > 25) {
            priority = "High";
          } else if (gap > 10) {
            priority = "Medium";
          }

          return {
            skillId:
              industrySkill.skill_id,
            skillName:
              industrySkill.skill?.name ??
              "Unknown Skill",
            category:
              industrySkill.skill
                ?.category ??
              "Other",
            demand,
            availability,
            gap,
            priority,
          };
        })
        .sort(
          (a, b) => b.gap - a.gap
        );
    },
    [
      industrySkills,
      traineeSkills,
    ]
  );

  /*
   * ---------------------------------------------------------
   * SUMMARY
   * ---------------------------------------------------------
   */

  const averageGap = useMemo(() => {
    if (gapResults.length === 0) {
      return 0;
    }

    const total = gapResults.reduce(
      (sum, item) =>
        sum + item.gap,
      0
    );

    return Math.round(
      total / gapResults.length
    );
  }, [gapResults]);

  const highPriorityCount =
    gapResults.filter(
      (item) =>
        item.priority === "High" ||
        item.priority === "Critical"
    ).length;

  const strongSkillCount =
    gapResults.filter(
      (item) => item.gap <= 10
    ).length;

  /*
   * ---------------------------------------------------------
   * RECOMMENDATIONS
   * ---------------------------------------------------------
   */

  const recommendations =
    useMemo<Recommendation[]>(() => {
      const missingSkills =
        gapResults
          .filter(
            (item) => item.gap > 10
          )
          .slice(0, 5);

      const recommendationsMap =
        new Map<
          number,
          Recommendation
        >();

      missingSkills.forEach(
        (gap) => {
          const coursesForSkill =
            courseSkills.filter(
              (courseSkill) =>
                courseSkill.skill_id ===
                gap.skillId
            );

          coursesForSkill.forEach(
            (courseSkill) => {
              if (
                !courseSkill.course
              ) {
                return;
              }

              const existing =
                recommendationsMap.get(
                  courseSkill.course_id
                );

              if (existing) {
                if (
                  !existing.matchedSkills.includes(
                    gap.skillName
                  )
                ) {
                  existing.matchedSkills.push(
                    gap.skillName
                  );
                }

                existing.score +=
                  courseSkill.importance;
              } else {
                recommendationsMap.set(
                  courseSkill.course_id,
                  {
                    courseId:
                      courseSkill.course_id,
                    name:
                      courseSkill.course
                        .name,
                    provider:
                      courseSkill.course
                        .provider ??
                      "SkillTrack Academy",
                    duration:
                      courseSkill.course
                        .duration_months,
                    matchedSkills: [
                      gap.skillName,
                    ],
                    score:
                      courseSkill.importance,
                  }
                );
              }
            }
          );
        }
      );

      return Array.from(
        recommendationsMap.values()
      )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 4);
    }, [
      gapResults,
      courseSkills,
    ]);

  /*
   * ---------------------------------------------------------
   * SELECTED INDUSTRY
   * ---------------------------------------------------------
   */

  const selectedIndustryData =
    industries.find(
      (industry) =>
        industry.id ===
        selectedIndustry
    );

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  const getPriorityStyles = (
    priority: GapResult["priority"]
  ) => {
    switch (priority) {
      case "Critical":
        return {
          badge:
            "bg-red-100 text-red-700",
          icon:
            "text-red-600",
        };

      case "High":
        return {
          badge:
            "bg-orange-100 text-orange-700",
          icon:
            "text-orange-600",
        };

      case "Medium":
        return {
          badge:
            "bg-yellow-100 text-yellow-700",
          icon:
            "text-yellow-600",
        };

      default:
        return {
          badge:
            "bg-green-100 text-green-700",
          icon:
            "text-green-600",
        };
    }
  };

  const getPriorityIcon = (
    priority: GapResult["priority"]
  ) => {
    if (priority === "Critical") {
      return XCircle;
    }

    if (priority === "High") {
      return AlertTriangle;
    }

    if (priority === "Medium") {
      return TrendingUp;
    }

    return CheckCircle2;
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2
            size={42}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-4 text-sm font-semibold text-slate-600">
            Loading Skill Gap Analytics...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Preparing your personalized analysis
          </p>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * PROFILE REQUIRED
   * ---------------------------------------------------------
   */

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              to="/trainee/dashboard"
              className="text-xl font-bold text-blue-700"
            >
              SkillTrack
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <UserCircle size={34} />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Complete Your Profile
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/trainee/profile"
                )
              }
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Complete Profile
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-16 items-center justify-between gap-4">
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

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                  {appUser?.full_name ??
                    "Trainee"}
                </p>

                <p className="text-xs text-slate-500">
                  Trainee
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
                className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:flex"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-3 pt-1">
            {navigationItems.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={( {
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

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 sm:hidden"
            >
              <LogOut size={15} />
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Breadcrumb */}

        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/trainee/dashboard"
            className="transition hover:text-blue-600"
          >
            Dashboard
          </Link>

          <ChevronRight size={15} />

          <span className="font-medium text-slate-700">
            Skill Gap
          </span>
        </div>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                  <Target size={27} />
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                    Career Intelligence
                  </p>

                  <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Discover Your Skill Gaps
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-blue-100 sm:text-base">
                SkillTrack compares your current
                skill proficiency with industry
                demand to identify the skills you
                should prioritize for your career.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/10 p-5 text-center backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Skills You Have
              </p>

              <p className="mt-1 text-4xl font-bold">
                {traineeSkills.length}
              </p>

              <p className="mt-1 text-xs text-blue-100">
                currently recorded
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            INDUSTRY SELECTOR
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Target Career Market
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Select Your Target Industry
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Skill demand will be compared against
                your current proficiency.
              </p>
            </div>

            <div className="relative w-full md:max-w-md">
              <select
                value={
                  selectedIndustry ?? ""
                }
                onChange={(e) => {
                  const value =
                    Number(
                      e.target.value
                    );

                  setSelectedIndustry(
                    value || null
                  );
                }}
                disabled={analyzing}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-11 font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              >
                <option value="">
                  Select an industry
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

              <ChevronDown
                size={19}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {selectedIndustryData?.description && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-600">
                {selectedIndustryData.description}
              </p>
            </div>
          )}
        </section>

        {/* =================================================
            ANALYZING
        ================================================= */}

        {analyzing ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={38}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 font-semibold text-slate-700">
                Analyzing your skills...
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Comparing your profile with
                industry demand
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* =============================================
                SUMMARY
            ============================================= */}

            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Skills Analyzed"
                value={
                  gapResults.length
                }
                icon={BookOpen}
                description="Industry skills evaluated"
              />

              <SummaryCard
                title="Average Gap"
                value={`${averageGap}%`}
                icon={TrendingUp}
                description="Average skill shortage"
              />

              <SummaryCard
                title="High Priority"
                value={
                  highPriorityCount
                }
                icon={AlertTriangle}
                description="High + critical gaps"
              />

              <SummaryCard
                title="Strong Skills"
                value={
                  strongSkillCount
                }
                icon={CheckCircle2}
                description="Skills with ≤10% gap"
              />
            </section>

            {/* =============================================
                NO TRAINEE SKILLS
            ============================================= */}

            {traineeSkills.length ===
              0 &&
              gapResults.length > 0 && (
                <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-amber-600"
                      size={23}
                    />

                    <div>
                      <h3 className="font-bold text-amber-900">
                        No personal skills added yet
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-800">
                        Your current availability
                        is therefore calculated as
                        0%. Add your skills and
                        proficiency levels to make
                        this analysis personalized.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/trainee/skills"
                          )
                        }
                        className="mt-4 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Add My Skills
                      </button>
                    </div>
                  </div>
                </section>
              )}

            {/* =============================================
                NO INDUSTRY DATA
            ============================================= */}

            {gapResults.length ===
            0 ? (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Target size={32} />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  No industry skill data found
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  This industry does not currently
                  have skill demand data. Please
                  select another industry or contact
                  an administrator.
                </p>
              </section>
            ) : (
              <>
                {/* =========================================
                    GAP TABLE
                ========================================= */}

                <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-6 sm:p-7">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                          Analysis Results
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                          Skill Gap Breakdown
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Comparing your availability
                          with{" "}
                          <span className="font-semibold text-slate-700">
                            {
                              selectedIndustryData?.name
                            }
                          </span>{" "}
                          demand.
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        {gapResults.length} skills
                        analyzed
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            Skill
                          </th>

                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            Industry Demand
                          </th>

                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            Your Availability
                          </th>

                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            Gap
                          </th>

                          <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            Priority
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {gapResults.map(
                          (item) => {
                            const styles =
                              getPriorityStyles(
                                item.priority
                              );

                            const PriorityIcon =
                              getPriorityIcon(
                                item.priority
                              );

                            return (
                              <tr
                                key={
                                  item.skillId
                                }
                                className="transition hover:bg-slate-50"
                              >
                                <td className="px-6 py-5">
                                  <div>
                                    <p className="font-bold text-slate-900">
                                      {
                                        item.skillName
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {
                                        item.category
                                      }
                                    </p>
                                  </div>
                                </td>

                                <td className="px-6 py-5 text-center">
                                  <span className="font-bold text-slate-800">
                                    {
                                      item.demand
                                    }
                                    %
                                  </span>
                                </td>

                                <td className="px-6 py-5 text-center">
                                  <span className="font-bold text-blue-600">
                                    {
                                      item.availability
                                    }
                                    %
                                  </span>
                                </td>

                                <td className="px-6 py-5 text-center">
                                  <span
                                    className={`font-bold ${
                                      item.gap >
                                      40
                                        ? "text-red-600"
                                        : item.gap >
                                          25
                                        ? "text-orange-600"
                                        : item.gap >
                                          10
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {
                                      item.gap
                                    }
                                    %
                                  </span>
                                </td>

                                <td className="px-6 py-5 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${styles.badge}`}
                                  >
                                    <PriorityIcon
                                      size={
                                        14
                                      }
                                    />

                                    {
                                      item.priority
                                    }
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* =========================================
                    HOW IT WORKS
                ========================================= */}

                <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Target size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-blue-900">
                        How SkillTrack calculates your gap
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-blue-800">
                        Industry demand represents how
                        important a skill is in the selected
                        industry. Your availability is
                        estimated from the proficiency level
                        you reported.
                      </p>

                      <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4 font-mono text-sm font-semibold text-blue-900">
                        Gap = max(0, Demand −
                        Availability)
                      </div>

                      <p className="mt-3 text-xs leading-5 text-blue-700">
                        Proficiency 1–5 is mapped to
                        20%–100% availability. A larger
                        positive gap means a higher priority
                        for improvement.
                      </p>
                    </div>
                  </div>
                </section>

                {/* =========================================
                    RECOMMENDATIONS
                ========================================= */}

                <section className="mt-8">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                      Personalized Learning
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Recommended Courses
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Courses are ranked according to how
                      strongly they address your highest
                      priority skill gaps.
                    </p>
                  </div>

                  {recommendations.length ===
                  0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                      <GraduationCap
                        size={40}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold text-slate-700">
                        No course recommendations
                        available.
                      </p>

                      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                        The administrator may need to
                        connect courses with relevant
                        skills.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      {recommendations.map(
                        (
                          recommendation
                        ) => (
                          <div
                            key={
                              recommendation.courseId
                            }
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                                <GraduationCap
                                  size={
                                    24
                                  }
                                />
                              </div>

                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                Recommended
                              </span>
                            </div>

                            <h3 className="mt-5 text-lg font-bold text-slate-900">
                              {
                                recommendation.name
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              {
                                recommendation.provider
                              }
                            </p>

                            <div className="mt-5">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Helps improve
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {recommendation.matchedSkills.map(
                                  (
                                    skill
                                  ) => (
                                    <span
                                      key={
                                        skill
                                      }
                                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                    >
                                      {
                                        skill
                                      }
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                              {recommendation.duration !==
                                null && (
                                <span className="text-xs font-medium text-slate-500">
                                  Duration:{" "}
                                  <span className="font-bold text-slate-700">
                                    {
                                      recommendation.duration
                                    }{" "}
                                    month
                                    {recommendation.duration !==
                                    1
                                      ? "s"
                                      : ""}
                                  </span>
                                </span>
                              )}

                              <span className="text-xs font-medium text-slate-500">
                                Match score:{" "}
                                <span className="font-bold text-slate-700">
                                  {
                                    recommendation.score
                                  }
                                </span>
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>

                {/* =========================================
                    NEXT ACTION
                ========================================= */}

                <section className="mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <GraduationCap
                          size={21}
                          className="text-indigo-600"
                        />

                        <h3 className="text-lg font-bold text-slate-900">
                          Turn your gaps into progress
                        </h3>
                      </div>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Add recommended training to your
                        learning journey and keep your
                        skills updated as you progress.
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
                        className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Update Skills
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            "/trainee/training"
                          )
                        }
                        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Manage Training
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* =============================================
                BACK TO DASHBOARD
            ============================================= */}

            <div className="mt-10 flex justify-center">
              <Link
                to="/trainee/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center sm:px-6">
          <p className="text-sm text-slate-500">
            SkillTrack — Post-Training Skill Gap
            Analytics Platform
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Track your skills. Understand the gap.
            Build your career.
          </p>
        </div>
      </footer>
    </div>
  );
}

/*
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: ElementType;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}