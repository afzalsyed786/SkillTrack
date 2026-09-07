import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface Industry {
  id: number;
  name: string;
}

interface SkillDemand {
  skill_id: number;
  demand_percentage: number;
  skill_name: string;
  category: string | null;
  trainee_availability: number;
  skill_gap: number;
  priority: string;
}

interface TraineeSkill {
  trainee_id: number;
  skill_id: number;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [traineeSkillCount, setTraineeSkillCount] =
    useState(0);

  const [industrySkillCount, setIndustrySkillCount] =
    useState(0);

  const [skillCount, setSkillCount] = useState(0);

  const [industryCount, setIndustryCount] =
    useState(0);

  const [totalTrainees, setTotalTrainees] =
    useState(0);

  const [industries, setIndustries] = useState<
    Industry[]
  >([]);

  const [selectedIndustry, setSelectedIndustry] =
    useState("");

  const [skillDemands, setSkillDemands] =
    useState<SkillDemand[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      loadSkillDemand();
    }
  }, [selectedIndustry, totalTrainees]);

  const loadAnalyticsData = async () => {
    setLoading(true);

    try {
      const [
        traineeSkillsResult,
        industrySkillsResult,
        skillsResult,
        industriesResult,
        traineesResult,
      ] = await Promise.all([
        supabase
          .from("trainee_skills")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("industry_skills")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("skills")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("industries")
          .select("id, name")
          .order("name"),

        supabase
          .from("trainees")
          .select("id", {
            count: "exact",
          }),
      ]);

      if (traineeSkillsResult.error) {
        throw traineeSkillsResult.error;
      }

      if (industrySkillsResult.error) {
        throw industrySkillsResult.error;
      }

      if (skillsResult.error) {
        throw skillsResult.error;
      }

      if (industriesResult.error) {
        throw industriesResult.error;
      }

      if (traineesResult.error) {
        throw traineesResult.error;
      }

      setTraineeSkillCount(
        traineeSkillsResult.count ?? 0
      );

      setIndustrySkillCount(
        industrySkillsResult.count ?? 0
      );

      setSkillCount(
        skillsResult.count ?? 0
      );

      const industryData =
        industriesResult.data ?? [];

      setIndustries(industryData);

      setIndustryCount(
        industryData.length
      );

      setTotalTrainees(
        traineesResult.count ?? 0
      );

      if (
        industryData.length > 0 &&
        !selectedIndustry
      ) {
        setSelectedIndustry(
          String(industryData[0].id)
        );
      }
    } catch (error) {
      console.error(
        "Error loading analytics data:",
        error
      );

      toast.error(
        "Failed to load analytics data."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSkillDemand = async () => {
    setLoadingDemand(true);

    try {
      const industryId =
        Number(selectedIndustry);

      const {
        data: demandData,
        error: demandError,
      } = await supabase
        .from("industry_skills")
        .select(
          "skill_id, demand_percentage"
        )
        .eq("industry_id", industryId);

      if (demandError) {
        throw demandError;
      }

      if (
        !demandData ||
        demandData.length === 0
      ) {
        setSkillDemands([]);
        return;
      }

      const skillIds = demandData.map(
        (item) => item.skill_id
      );

      const {
        data: skillsData,
        error: skillsError,
      } = await supabase
        .from("skills")
        .select(
          "id, name, category"
        )
        .in("id", skillIds);

      if (skillsError) {
        throw skillsError;
      }

      const {
        data: traineeSkillsData,
        error: traineeSkillsError,
      } = await supabase
        .from("trainee_skills")
        .select(
          "trainee_id, skill_id"
        )
        .in(
          "skill_id",
          skillIds
        );

      if (traineeSkillsError) {
        throw traineeSkillsError;
      }

      const skillMap = new Map(
        (skillsData ?? []).map(
          (skill) => [
            skill.id,
            skill,
          ]
        )
      );

      const traineeMap = new Map<
        number,
        Set<number>
      >();

      (
        (traineeSkillsData ??
          []) as TraineeSkill[]
      ).forEach((record) => {
        if (
          !traineeMap.has(
            record.skill_id
          )
        ) {
          traineeMap.set(
            record.skill_id,
            new Set<number>()
          );
        }

        traineeMap
          .get(record.skill_id)!
          .add(
            record.trainee_id
          );
      });

      const combinedData: SkillDemand[] =
        demandData.map((item) => {
          const skill =
            skillMap.get(
              item.skill_id
            );

          const traineesWithSkill =
            traineeMap.get(
              item.skill_id
            )?.size ?? 0;

          const availability =
            totalTrainees > 0
              ? (traineesWithSkill /
                  totalTrainees) *
                100
              : 0;

          const roundedAvailability =
            Number(
              availability.toFixed(1)
            );

          const skillGap =
            Math.max(
              0,
              Number(
                item.demand_percentage
              ) -
                roundedAvailability
            );

          const roundedSkillGap =
            Number(
              skillGap.toFixed(1)
            );

          let priority = "Low";

          if (
            roundedSkillGap > 40
          ) {
            priority = "Critical";
          } else if (
            roundedSkillGap > 25
          ) {
            priority = "High";
          } else if (
            roundedSkillGap > 10
          ) {
            priority = "Medium";
          }

          return {
            skill_id:
              item.skill_id,

            demand_percentage:
              Number(
                item.demand_percentage
              ),

            skill_name:
              skill?.name ??
              "Unknown Skill",

            category:
              skill?.category ??
              null,

            trainee_availability:
              roundedAvailability,

            skill_gap:
              roundedSkillGap,

            priority,
          };
        });

      const topSkillGaps =
        [...combinedData]
          .sort(
            (a, b) =>
              b.skill_gap -
              a.skill_gap
          )
          .slice(0, 5);

      setSkillDemands(
        topSkillGaps
      );
    } catch (error) {
      console.error(
        "Error loading skill analytics:",
        error
      );

      setSkillDemands([]);

      toast.error(
        "Failed to load skill-gap analytics."
      );
    } finally {
      setLoadingDemand(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadAnalyticsData();

    if (selectedIndustry) {
      await loadSkillDemand();
    }

    setRefreshing(false);

    toast.success(
      "Analytics refreshed."
    );
  };

  const getPriorityStyle = (
    priority: string
  ) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-700";

      case "High":
        return "bg-orange-100 text-orange-700";

      case "Medium":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-green-100 text-green-700";
    }
  };

  const selectedIndustryName =
    industries.find(
      (industry) =>
        String(industry.id) ===
        selectedIndustry
    )?.name ?? "Selected Industry";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Skill Gap Analytics
              </h1>

              <p className="text-sm text-slate-500">
                Analyze trainee skills against industry demand
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <button
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>

          </div>

        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">

        {loading ? (

          <div className="flex min-h-[400px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

              <p className="mt-4 text-sm font-medium text-slate-600">
                Loading analytics...
              </p>

            </div>

          </div>

        ) : (

          <>

            {/* Industry Selector */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Industry Analysis
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Compare trainee availability with industry demand.
                  </p>

                </div>

                <div className="w-full md:w-[360px]">

                  <label className="block text-sm font-semibold text-slate-700">
                    Select Industry
                  </label>

                  <select
                    value={selectedIndustry}
                    onChange={(event) =>
                      setSelectedIndustry(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {industries.map(
                      (industry) => (
                        <option
                          key={
                            industry.id
                          }
                          value={
                            industry.id
                          }
                        >
                          {industry.name}
                        </option>
                      )
                    )}
                  </select>

                </div>

              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">

                <p className="text-sm text-slate-500">
                  Analyzing
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {selectedIndustryName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Total trainees analyzed:{" "}
                  <span className="font-semibold text-slate-700">
                    {totalTrainees}
                  </span>
                </p>

              </div>

            </section>

            {/* Statistics */}
            <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-slate-500">
                  Trainee Skill Records
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {traineeSkillCount}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Recorded trainee skills
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-slate-500">
                  Industry Skill Records
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {industrySkillCount}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Demand mappings
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-slate-500">
                  Total Skills
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {skillCount}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Skills in SkillTrack
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <p className="text-sm font-medium text-slate-500">
                  Industries
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {industryCount}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Available industries
                </p>

              </div>

            </section>

            {/* Chart */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Top Skill Gaps
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Skills with the largest difference between industry demand and trainee availability.
                </p>

              </div>

              {loadingDemand ? (

                <div className="flex min-h-[380px] items-center justify-center">

                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                </div>

              ) : skillDemands.length === 0 ? (

                <div className="flex min-h-[380px] items-center justify-center">

                  <div className="text-center">

                    <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />

                    <p className="mt-4 font-semibold text-slate-600">
                      No skill-gap data available
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Add industry skill-demand records to see analytics.
                    </p>

                  </div>

                </div>

              ) : (

                <div className="mt-6 h-[380px] w-full">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={skillDemands}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 70,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="skill_name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={90}
                      />

                      <YAxis
                        domain={[0, 100]}
                        unit="%"
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) => [
                          `${value ?? 0}%`,
                          "Skill Gap",
                        ]}
                      />

                      <Bar
                        dataKey="skill_gap"
                        name="Skill Gap"
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

                </div>

              )}

            </section>

            {/* Table */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 p-6">

                <h2 className="text-xl font-bold text-slate-900">
                  Detailed Skill Gap Analysis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ranked by the largest skill gap.
                </p>

              </div>

              {loadingDemand ? (

                <div className="flex min-h-[200px] items-center justify-center">

                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                </div>

              ) : skillDemands.length === 0 ? (

                <div className="p-8 text-center text-slate-500">
                  No skill demand data found for this industry.
                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-200 bg-slate-50 text-left">

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Rank
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Skill
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Category
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Industry Demand
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Trainee Availability
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Skill Gap
                        </th>

                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          Priority
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {skillDemands.map(
                        (
                          skill,
                          index
                        ) => (

                          <tr
                            key={
                              skill.skill_id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >

                            {/* Rank */}
                            <td className="px-6 py-4">

                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                                {index + 1}
                              </span>

                            </td>

                            {/* Skill */}
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {skill.skill_name}
                            </td>

                            {/* Category */}
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {skill.category ?? "—"}
                            </td>

                            {/* Industry Demand */}
                            <td className="px-6 py-4">

                              <div className="flex min-w-[180px] items-center gap-3">

                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">

                                  <div
                                    className="h-full rounded-full bg-blue-600"
                                    style={{
                                      width: `${skill.demand_percentage}%`,
                                    }}
                                  />

                                </div>

                                <span className="min-w-[50px] text-sm font-bold text-slate-700">
                                  {skill.demand_percentage}%
                                </span>

                              </div>

                            </td>

                            {/* Availability */}
                            <td className="px-6 py-4">

                              <div className="flex min-w-[180px] items-center gap-3">

                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">

                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{
                                      width: `${skill.trainee_availability}%`,
                                    }}
                                  />

                                </div>

                                <span className="min-w-[50px] text-sm font-bold text-slate-700">
                                  {skill.trainee_availability}%
                                </span>

                              </div>

                            </td>

                            {/* Gap */}
                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                                  skill.skill_gap >
                                  40
                                    ? "bg-red-100 text-red-700"
                                    : skill.skill_gap >
                                      25
                                    ? "bg-orange-100 text-orange-700"
                                    : skill.skill_gap >
                                      10
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {skill.skill_gap}%
                              </span>

                            </td>

                            {/* Priority */}
                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${getPriorityStyle(
                                  skill.priority
                                )}`}
                              >
                                {skill.priority}
                              </span>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </>

        )}

      </main>

    </div>
  );
}