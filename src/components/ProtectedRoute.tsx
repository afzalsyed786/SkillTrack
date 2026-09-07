import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, appUser, loading } = useAuth();
  const location = useLocation();

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

  // User is not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // User is logged in but is not an admin
  if (appUser?.role !== "ADMIN") {
    return <Navigate to="/trainee/dashboard" replace />;
  }

  // User is an admin
  return <Outlet />;
}