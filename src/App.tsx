import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Public pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Trainee pages
import TraineeDashboard from "./pages/TraineeDashboard";
import Profile from "./pages/Profile";
import Skills from "./pages/Skills";
import Training from "./pages/Training";
import Employment from "./pages/Employment";
import Feedback from "./pages/Feedback";
import SkillGap from "./pages/SkillGap";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminTrainees from "./pages/AdminTrainees";
import AdminCourses from "./pages/AdminCourses";
import AdminSkills from "./pages/AdminSkills";
import AdminIndustries from "./pages/AdminIndustries";
import AdminJobRoles from "./pages/AdminJobRoles";
import AdminSkillDemand from "./pages/AdminSkillDemand";
import AdminAnalytics from "./pages/AdminAnalytics";

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 text-center shadow-xl">
        <h1 className="text-4xl font-bold text-blue-700">
          SkillTrack
        </h1>

        <p className="mt-4 text-lg text-slate-600">
          Post-Training Skill Gap Analytics Platform
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <a
            href="/login"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Login
          </a>

          <a
            href="/register"
            className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}

/*
 * Protects all trainee pages.
 *
 * - Not logged in → Login
 * - Admin → Admin Dashboard
 * - Trainee → requested trainee page
 */
function TraineeRoute() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (appUser?.role === "ADMIN") {
    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          richColors
        />

        <Routes>
          {/* =========================
              PUBLIC ROUTES
          ========================= */}

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* =========================
              TRAINEE ROUTES
          ========================= */}

          <Route element={<TraineeRoute />}>
            <Route
              path="/trainee/dashboard"
              element={<TraineeDashboard />}
            />

            <Route
              path="/trainee/profile"
              element={<Profile />}
            />

            <Route
              path="/trainee/skills"
              element={<Skills />}
            />

            <Route
              path="/trainee/training"
              element={<Training />}
            />

            <Route
              path="/trainee/employment"
              element={<Employment />}
            />

            <Route
              path="/trainee/feedback"
              element={<Feedback />}
            />

            <Route
              path="/trainee/skill-gap"
              element={<SkillGap />}
            />
          </Route>

          {/* =========================
              ADMIN ROUTES
          ========================= */}

          <Route element={<ProtectedRoute />}>
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/trainees"
              element={<AdminTrainees />}
            />

            <Route
              path="/admin/courses"
              element={<AdminCourses />}
            />

            <Route
              path="/admin/skills"
              element={<AdminSkills />}
            />

            <Route
              path="/admin/industries"
              element={<AdminIndustries />}
            />

            <Route
              path="/admin/job-roles"
              element={<AdminJobRoles />}
            />

            <Route
              path="/admin/skill-demand"
              element={<AdminSkillDemand />}
            />

            <Route
              path="/admin/analytics"
              element={<AdminAnalytics />}
            />
          </Route>

          {/* =========================
              UNKNOWN ROUTE
          ========================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;