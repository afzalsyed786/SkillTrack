import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  GraduationCap,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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
import { toast } from "sonner";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface DashboardStats {
  trainees: number;
  courses: number;
  skills: number;
  industries: number;
  jobRoles: number;
  trainings: number;
  completedTrainings: number;
  employed: number;
  employmentRate: number;
  averageSkill: number;
  feedbackAverage: number;
}

interface TrainingStatus {
  name: string;
  value: number;
}

interface EmploymentStatus {
  name: string;
  value: number;
}

interface SkillDemand {
  name: string;
  demand: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { appUser, logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    trainees: 0,
    courses: 0,
    skills: 0,
    industries: 0,
    jobRoles: 0,
    trainings: 0,
    completedTrainings: 0,
    employed: 0,
    employmentRate: 0,
    averageSkill: 0,
    feedbackAverage: 0,
  });

  const [trainingStatus, setTrainingStatus] = useState<
    TrainingStatus[]
  >([]);

  const [employmentStatus, setEmploymentStatus] = useState<
    EmploymentStatus[]
  >([]);

  const [skillDemand, setSkillDemand] = useState<
    SkillDemand[]
  >([]);

  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const [
        traineesResult,
        coursesResult,
        skillsResult,
        industriesResult,
        jobRolesResult,
        trainingsResult,
        employmentResult,
        traineeSkillsResult,
        feedbackResult,
        industrySkillsResult,
        allSkillsResult,
      ] = await Promise.all([
        supabase
          .from("trainees")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("courses")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("skills")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("industries")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("job_roles")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("trainings")
          .select("id, status"),

        supabase
          .from("employment")
          .select("id, employment_status"),

        supabase
          .from("trainee_skills")
          .select("proficiency"),

        supabase
          .from("feedback")
          .select(
            "training_rating, usefulness_rating, recommendation_rating"
          ),

        supabase
          .from("industry_skills")
          .select("skill_id, demand_percentage"),

        supabase
          .from("skills")
          .select("id, name"),
      ]);

      const trainees = traineesResult.count ?? 0;
      const courses = coursesResult.count ?? 0;
      const skills = skillsResult.count ?? 0;
      const industries = industriesResult.count ?? 0;
      const jobRoles = jobRolesResult.count ?? 0;

      const trainings = trainingsResult.data ?? [];
      const employment = employmentResult.data ?? [];
      const traineeSkills = traineeSkillsResult.data ?? [];
      const feedback = feedbackResult.data ?? [];
      const industrySkills = industrySkillsResult.data ?? [];
      const allSkills = allSkillsResult.data ?? [];

      const completedTrainings = trainings.filter(
        (training) => training.status === "COMPLETED"
      ).length;

      const employed = employment.filter(
        (item) =>
          item.employment_status === "EMPLOYED" ||
          item.employment_status === "SELF_EMPLOYED"
      ).length;

      const employmentRate =
        trainees > 0
          ? Number(((employed / trainees) * 100).toFixed(1))
          : 0;

      const averageSkill =
        traineeSkills.length > 0
          ? Number(
              (
                traineeSkills.reduce(
                  (sum, item) => sum + item.proficiency,
                  0
                ) / traineeSkills.length
              ).toFixed(2)
            )
          : 0;

      const feedbackValues: number[] = [];

      feedback.forEach((item) => {
        if (item.training_rating != null) {
          feedbackValues.push(item.training_rating);
        }

        if (item.usefulness_rating != null) {
          feedbackValues.push(item.usefulness_rating);
        }

        if (item.recommendation_rating != null) {
          feedbackValues.push(item.recommendation_rating);
        }
      });

      const feedbackAverage =
        feedbackValues.length > 0
          ? Number(
              (
                feedbackValues.reduce(
                  (sum, value) => sum + value,
                  0
                ) / feedbackValues.length
              ).toFixed(2)
            )
          : 0;

      const trainingCounts: Record<string, number> = {
        ONGOING: 0,
        COMPLETED: 0,
        DROPPED: 0,
      };

      trainings.forEach((training) => {
        if (training.status in trainingCounts) {
          trainingCounts[training.status]++;
        }
      });

      setTrainingStatus([
        {
          name: "Completed",
          value: trainingCounts.COMPLETED,
        },
        {
          name: "Ongoing",
          value: trainingCounts.ONGOING,
        },
        {
          name: "Dropped",
          value: trainingCounts.DROPPED,
        },
      ]);

      const employmentCounts: Record<string, number> = {
        EMPLOYED: 0,
        SELF_EMPLOYED: 0,
        UNEMPLOYED: 0,
        HIGHER_STUDIES: 0,
      };

      employment.forEach((item) => {
        if (item.employment_status in employmentCounts) {
          employmentCounts[item.employment_status]++;
        }
      });

      setEmploymentStatus([
        {
          name: "Employed",
          value: employmentCounts.EMPLOYED,
        },
        {
          name: "Self Employed",
          value: employmentCounts.SELF_EMPLOYED,
        },
        {
          name: "Unemployed",
          value: employmentCounts.UNEMPLOYED,
        },
        {
          name: "Higher Studies",
          value: employmentCounts.HIGHER_STUDIES,
        },
      ]);

      const skillNameMap = new Map<number, string>();

      allSkills.forEach((skill) => {
        skillNameMap.set(skill.id, skill.name);
      });

      const demandMap = new Map<number, number[]>();

      industrySkills.forEach((item) => {
        if (!demandMap.has(item.skill_id)) {
          demandMap.set(item.skill_id, []);
        }

        demandMap
          .get(item.skill_id)!
          .push(Number(item.demand_percentage));
      });

      const calculatedDemand: SkillDemand[] = Array.from(
        demandMap.entries()
      )
        .map(([skillId, demands]) => {
          const average =
            demands.reduce(
              (sum, value) => sum + value,
              0
            ) / demands.length;

          return {
            name:
              skillNameMap.get(skillId) ??
              `Skill ${skillId}`,
            demand: Number(average.toFixed(1)),
          };
        })
        .sort((a, b) => b.demand - a.demand)
        .slice(0, 8);

      setSkillDemand(calculatedDemand);

      setStats({
        trainees,
        courses,
        skills,
        industries,
        jobRoles,
        trainings: trainings.length,
        completedTrainings,
        employed,
        employmentRate,
        averageSkill,
        feedbackAverage,
      });
    } catch (error) {
      console.error(
        "Unexpected dashboard error:",
        error
      );

      toast.error(
        "Unable to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const trainingColors = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
  ];

  const statCards = [
    {
      title: "Total Trainees",
      value: stats.trainees,
      icon: Users,
      description: "Registered trainees",
    },
    {
      title: "Courses",
      value: stats.courses,
      icon: BookOpen,
      description: "Available courses",
    },
    {
      title: "Skills",
      value: stats.skills,
      icon: Sparkles,
      description: "Skills in database",
    },
    {
      title: "Industries",
      value: stats.industries,
      icon: Building2,
      description: "Industry sectors",
    },
    {
      title: "Job Roles",
      value: stats.jobRoles,
      icon: Briefcase,
      description: "Available job roles",
    },
    {
      title: "Trainings",
      value: stats.trainings,
      icon: GraduationCap,
      description: `${stats.completedTrainings} completed`,
    },
    {
      title: "Employment Rate",
      value: `${stats.employmentRate}%`,
      icon: Activity,
      description: `${stats.employed} employed`,
    },
    {
      title: "Average Skill",
      value: `${stats.averageSkill}/5`,
      icon: BarChart3,
      description: "Trainee proficiency",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  SkillTrack Admin
                </h1>

                <p className="text-sm text-slate-500">
                  Post-Training Skill Gap Analytics Platform
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {appUser?.full_name ??
                  "Administrator"}
              </p>

              <p className="text-xs text-slate-500">
                {appUser?.email ?? ""}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Admin Dashboard
            </h2>

            <p className="mt-2 text-slate-500">
              Monitor trainees, training outcomes, skills
              and employment.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh Data
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {loading ? "—" : card.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {card.description}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon size={21} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Training Status
              </h3>

              <p className="text-sm text-slate-500">
                Current status of all training records
              </p>
            </div>

            <div className="h-72">
              {trainingStatus.some(
                (item) => item.value > 0
              ) ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={trainingStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {trainingStatus.map(
                        (_, index) => (
                          <Cell
                            key={`training-${index}`}
                            fill={
                              trainingColors[
                                index
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
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No training data available
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Employment Status
              </h3>

              <p className="text-sm text-slate-500">
                Current career outcomes of trainees
              </p>
            </div>

            <div className="h-72">
              {employmentStatus.some(
                (item) => item.value > 0
              ) ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={employmentStatus}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />

                    <YAxis allowDecimals={false} />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      name="Trainees"
                      fill="#2563eb"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No employment data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skill demand chart */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              Most Demanded Skills
            </h3>

            <p className="text-sm text-slate-500">
              Average industry demand across the
              SkillTrack database
            </p>
          </div>

          <div className="h-80">
            {skillDemand.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={skillDemand}
                  layout="vertical"
                  margin={{
                    left: 20,
                    right: 30,
                    top: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Demand",
                    ]}
                  />

                  <Bar
                    dataKey="demand"
                    name="Industry Demand"
                    fill="#7c3aed"
                    radius={[
                      0,
                      6,
                      6,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No skill-demand data available
              </div>
            )}
          </div>
        </div>

        {/* Management */}
        <div className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage the core SkillTrack data and analytics
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trainees */}
            <button
              onClick={() =>
                navigate("/admin/trainees")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Manage Trainees
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                View and manage registered trainee
                profiles.
              </p>

              <p className="mt-4 text-sm font-semibold text-blue-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Courses */}
            <button
              onClick={() =>
                navigate("/admin/courses")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <BookOpen size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Manage Courses
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add, edit and remove training courses.
              </p>

              <p className="mt-4 text-sm font-semibold text-emerald-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Skills */}
            <button
              onClick={() =>
                navigate("/admin/skills")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-violet-50 p-3 text-violet-600">
                <Sparkles size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Manage Skills
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Manage the skills available in the
                platform.
              </p>

              <p className="mt-4 text-sm font-semibold text-violet-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Industries */}
            <button
              onClick={() =>
                navigate("/admin/industries")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-orange-50 p-3 text-orange-600">
                <Building2 size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Manage Industries
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add and manage industries used for
                analytics.
              </p>

              <p className="mt-4 text-sm font-semibold text-orange-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Job Roles */}
            <button
              onClick={() =>
                navigate("/admin/job-roles")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-pink-50 p-3 text-pink-600">
                <Briefcase size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Manage Job Roles
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add, edit and manage job roles linked
                to industries.
              </p>

              <p className="mt-4 text-sm font-semibold text-pink-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Skill Demand */}
            <button
              onClick={() =>
                navigate("/admin/skill-demand")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-cyan-50 p-3 text-cyan-600">
                <BarChart3 size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Skill Demand
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Manage industry demand percentages for
                skills.
              </p>

              <p className="mt-4 text-sm font-semibold text-cyan-600 group-hover:underline">
                Open Management →
              </p>
            </button>

            {/* Skill Gap Analytics */}
            <button
              onClick={() =>
                navigate("/admin/analytics")
              }
              className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Activity size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                Skill Gap Analytics
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Compare trainee skill availability with
                industry demand and identify skill gaps.
              </p>

              <p className="mt-4 text-sm font-semibold text-indigo-600 group-hover:underline">
                Open Analytics →
              </p>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <h3 className="font-semibold text-blue-900">
                SkillTrack Administration
              </h3>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Manage the data that powers trainee
                skill-gap analysis, industry demand
                analysis and employment insights.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}