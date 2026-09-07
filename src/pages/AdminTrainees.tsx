import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  Users,
  Mail,
  MapPin,
  GraduationCap,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface Trainee {
  id: number;
  user_id: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  education_level: string | null;
  institution: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface TraineeRow extends Trainee {
  user: UserProfile | null;
}

export default function AdminTrainees() {
  const [trainees, setTrainees] = useState<TraineeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadTrainees = async () => {
    setLoading(true);

    try {
      const { data: traineeData, error: traineeError } = await supabase
        .from("trainees")
        .select(
          "id, user_id, phone, city, state, education_level, institution, created_at"
        )
        .order("created_at", { ascending: false });

      if (traineeError) {
        throw traineeError;
      }

      if (!traineeData || traineeData.length === 0) {
        setTrainees([]);
        return;
      }

      const userIds = traineeData.map((trainee) => trainee.user_id);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .in("id", userIds);

      if (userError) {
        throw userError;
      }

      const users = userData ?? [];

      const rows: TraineeRow[] = traineeData.map((trainee) => ({
        ...trainee,
        user:
          users.find((user) => user.id === trainee.user_id) ?? null,
      }));

      setTrainees(rows);
    } catch (error) {
      console.error("Error loading trainees:", error);
      toast.error("Failed to load trainees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainees();
  }, []);

  const filteredTrainees = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return trainees;
    }

    return trainees.filter((trainee) => {
      const name = trainee.user?.full_name?.toLowerCase() ?? "";
      const email = trainee.user?.email?.toLowerCase() ?? "";
      const city = trainee.city?.toLowerCase() ?? "";
      const state = trainee.state?.toLowerCase() ?? "";
      const institution =
        trainee.institution?.toLowerCase() ?? "";

      return (
        name.includes(term) ||
        email.includes(term) ||
        city.includes(term) ||
        state.includes(term) ||
        institution.includes(term)
      );
    });
  }, [search, trainees]);

  const deleteTrainee = async (trainee: TraineeRow) => {
    const name = trainee.user?.full_name || "this trainee";

    const confirmed = window.confirm(
      `Delete trainee profile for ${name}?\n\nThis will remove the trainee profile and related trainee data.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("trainees")
        .delete()
        .eq("id", trainee.id);

      if (error) {
        throw error;
      }

      toast.success("Trainee profile deleted");

      setTrainees((current) =>
        current.filter((item) => item.id !== trainee.id)
      );
    } catch (error) {
      console.error("Delete trainee error:", error);
      toast.error("Failed to delete trainee");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
                title="Go back"
              >
                <ArrowLeft size={19} />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Trainee Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View and manage registered trainees
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadTrainees}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Trainees
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {trainees.length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Search Results
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredTrainees.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Profiles Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {
                trainees.filter(
                  (trainee) =>
                    trainee.city &&
                    trainee.state &&
                    trainee.education_level &&
                    trainee.institution
                ).length
              }
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, city, state or institution..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex min-h-60 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="text-center">
              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading trainees...
              </p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredTrainees.length === 0 && (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <Users
              size={42}
              className="mx-auto text-slate-300"
            />

            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No trainees found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "No trainee profiles have been created yet."}
            </p>
          </div>
        )}

        {/* Trainee cards */}
        {!loading && filteredTrainees.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTrainees.map((trainee) => (
              <div
                key={trainee.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                {/* Name */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                      {(
                        trainee.user?.full_name?.charAt(0) || "T"
                      ).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-900">
                        {trainee.user?.full_name || "Unknown Trainee"}
                      </h2>

                      <p className="text-xs text-slate-500">
                        Trainee ID: {trainee.id}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    TRAINEE
                  </span>
                </div>

                {/* Details */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <p className="break-all text-sm text-slate-600">
                      {trainee.user?.email || "No email"}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <p className="text-sm text-slate-600">
                      {trainee.city || trainee.state
                        ? [trainee.city, trainee.state]
                            .filter(Boolean)
                            .join(", ")
                        : "Location not provided"}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <GraduationCap
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <div>
                      <p className="text-sm text-slate-600">
                        {trainee.education_level ||
                          "Education not provided"}
                      </p>

                      {trainee.institution && (
                        <p className="mt-1 text-xs text-slate-400">
                          {trainee.institution}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    Joined{" "}
                    {new Date(
                      trainee.created_at
                    ).toLocaleDateString()}
                  </p>

                  <button
                    onClick={() => deleteTrainee(trainee)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}