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

interface FeedbackRecord {
  id: number;
  training_rating: number | null;
  usefulness_rating: number | null;
  recommendation_rating: number | null;
  comments: string | null;
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

export default function Feedback() {
  const { user, appUser, logout } = useAuth();
  const navigate = useNavigate();

  const [trainingRating, setTrainingRating] =
    useState("5");

  const [usefulnessRating, setUsefulnessRating] =
    useState("5");

  const [recommendationRating, setRecommendationRating] =
    useState("5");

  const [comments, setComments] = useState("");

  const [feedback, setFeedback] =
    useState<FeedbackRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadFeedback = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
        data,
        error,
      } = await supabase
        .from("feedback")
        .select(
          `
            id,
            training_rating,
            usefulness_rating,
            recommendation_rating,
            comments
          `
        )
        .eq("trainee_id", trainee.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Feedback loading error:",
          error
        );

        toast.error(
          "Unable to load your feedback."
        );

        return;
      }

      if (data) {
        const record =
          data as FeedbackRecord;

        setFeedback(record);

        setTrainingRating(
          String(record.training_rating ?? 5)
        );

        setUsefulnessRating(
          String(record.usefulness_rating ?? 5)
        );

        setRecommendationRating(
          String(
            record.recommendation_rating ?? 5
          )
        );

        setComments(
          record.comments ?? ""
        );
      } else {
        setFeedback(null);
        setTrainingRating("5");
        setUsefulnessRating("5");
        setRecommendationRating("5");
        setComments("");
      }
    } catch (error) {
      console.error(
        "Unexpected feedback loading error:",
        error
      );

      toast.error(
        "Something went wrong while loading feedback."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [user]);

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      toast.error("You are not logged in.");
      return;
    }

    if (!comments.trim()) {
      toast.error(
        "Please enter your feedback comments."
      );
      return;
    }

    const trainingValue =
      Number(trainingRating);

    const usefulnessValue =
      Number(usefulnessRating);

    const recommendationValue =
      Number(recommendationRating);

    if (
      trainingValue < 1 ||
      trainingValue > 5 ||
      usefulnessValue < 1 ||
      usefulnessValue > 5 ||
      recommendationValue < 1 ||
      recommendationValue > 5
    ) {
      toast.error(
        "Please select valid ratings."
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
        training_rating: trainingValue,
        usefulness_rating: usefulnessValue,
        recommendation_rating:
          recommendationValue,
        comments: comments.trim(),
      };

      const {
        error,
      } = await supabase
        .from("feedback")
        .upsert(payload, {
          onConflict: "trainee_id",
        });

      if (error) {
        console.error(
          "Save feedback error:",
          error
        );

        toast.error(error.message);
        return;
      }

      toast.success(
        "Feedback submitted successfully!"
      );

      await loadFeedback();
    } catch (error) {
      console.error(
        "Unexpected feedback submission error:",
        error
      );

      toast.error(
        "Something went wrong while submitting feedback."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;

    setDeleting(true);

    try {
      const {
        error,
      } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedback.id);

      if (error) {
        console.error(
          "Delete feedback error:",
          error
        );

        toast.error(
          "Unable to remove feedback."
        );

        return;
      }

      toast.success(
        "Feedback removed successfully."
      );

      setFeedback(null);
      setTrainingRating("5");
      setUsefulnessRating("5");
      setRecommendationRating("5");
      setComments("");
    } catch (error) {
      console.error(
        "Unexpected delete feedback error:",
        error
      );

      toast.error(
        "Something went wrong while removing feedback."
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

  const averageRating = feedback
    ? (
        (feedback.training_rating ?? 0) +
        (feedback.usefulness_rating ?? 0) +
        (feedback.recommendation_rating ?? 0)
      ) / 3
    : 0;

  const getRatingLabel = (
    value: number
  ) => {
    if (value === 1) return "Very Poor";
    if (value === 2) return "Poor";
    if (value === 3) return "Average";
    if (value === 4) return "Good";
    return "Excellent";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading feedback...
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
                Training Feedback
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                Share Your Experience
              </h2>

              <p className="mt-2 max-w-2xl text-slate-600">
                Your feedback helps SkillTrack
                understand training effectiveness
                and improve future learning
                programs.
              </p>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-3">
              <p className="text-xs font-medium text-blue-600">
                Feedback Status
              </p>

              <p className="mt-1 text-lg font-bold text-blue-700">
                {feedback
                  ? "Submitted"
                  : "Not Submitted"}
              </p>
            </div>
          </div>
        </div>

        {/* =========================
            FEEDBACK STATS
        ========================= */}

        {feedback && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Training Rating
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {feedback.training_rating ?? 0}/5
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {getRatingLabel(
                  feedback.training_rating ?? 5
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Usefulness
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {feedback.usefulness_rating ?? 0}/5
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Career usefulness
              </p>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Average Rating
              </p>

              <p className="mt-2 text-3xl font-bold text-purple-600">
                {averageRating.toFixed(1)}/5
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Across all ratings
              </p>
            </div>
          </div>
        )}

        {/* =========================
            FEEDBACK FORM
        ========================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {feedback
                ? "Update Your Feedback"
                : "Submit Training Feedback"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Rate your training experience and
              provide comments.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6"
          >
            {/* Training rating */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                How would you rate the training?
              </label>

              <select
                value={trainingRating}
                onChange={(e) =>
                  setTrainingRating(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="1">
                  1 — Very Poor
                </option>

                <option value="2">
                  2 — Poor
                </option>

                <option value="3">
                  3 — Average
                </option>

                <option value="4">
                  4 — Good
                </option>

                <option value="5">
                  5 — Excellent
                </option>
              </select>
            </div>

            {/* Usefulness rating */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                How useful was the training
                for your career?
              </label>

              <select
                value={usefulnessRating}
                onChange={(e) =>
                  setUsefulnessRating(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="1">
                  1 — Not Useful
                </option>

                <option value="2">
                  2 — Slightly Useful
                </option>

                <option value="3">
                  3 — Moderately Useful
                </option>

                <option value="4">
                  4 — Very Useful
                </option>

                <option value="5">
                  5 — Extremely Useful
                </option>
              </select>
            </div>

            {/* Recommendation */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Would you recommend this
                training?
              </label>

              <select
                value={recommendationRating}
                onChange={(e) =>
                  setRecommendationRating(
                    e.target.value
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="1">
                  1 — Definitely No
                </option>

                <option value="2">
                  2 — Probably No
                </option>

                <option value="3">
                  3 — Not Sure
                </option>

                <option value="4">
                  4 — Probably Yes
                </option>

                <option value="5">
                  5 — Definitely Yes
                </option>
              </select>
            </div>

            {/* Comments */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Additional Comments
              </label>

              <textarea
                value={comments}
                onChange={(e) =>
                  setComments(
                    e.target.value
                  )
                }
                disabled={saving}
                rows={6}
                maxLength={1000}
                placeholder="Tell us about your training experience..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>
                  Your feedback helps improve
                  future training.
                </span>

                <span>
                  {comments.length}/1000
                </span>
              </div>
            </div>

            {/* Submit */}

            <button
              type="submit"
              disabled={
                saving || !comments.trim()
              }
              className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving Feedback..."
                : feedback
                ? "Update Feedback"
                : "Submit Feedback"}
            </button>
          </form>
        </section>

        {/* =========================
            SUBMITTED FEEDBACK
        ========================= */}

        {feedback && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Your Submitted Feedback
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your current feedback stored in
                  SkillTrack.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Removing..."
                  : "Remove Feedback"}
              </button>
            </div>

            {/* Rating cards */}

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Training
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {feedback.training_rating ??
                    0}
                  /5
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Usefulness
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {feedback.usefulness_rating ??
                    0}
                  /5
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Recommendation
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {feedback.recommendation_rating ??
                    0}
                  /5
                </p>
              </div>
            </div>

            {/* Comments */}

            {feedback.comments && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">
                  Your Comments
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {feedback.comments}
                </p>
              </div>
            )}
          </section>
        )}

        {/* =========================
            NEXT STEP
        ========================= */}

        <section className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Ready to check your skill gaps?
              </h3>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                SkillTrack uses your skills and
                industry demand data to identify
                the skills you should prioritize
                next.
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