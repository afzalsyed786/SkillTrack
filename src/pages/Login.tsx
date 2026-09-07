import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await login(
        email.trim(),
        password
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      /*
       * Login succeeded.
       * Now get the authenticated user and
       * check their application role.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error(
          "Login succeeded, but user information could not be loaded."
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        console.error(
          "Profile lookup error:",
          profileError
        );

        toast.error(
          "Unable to determine your account role."
        );
        return;
      }

      toast.success("Login successful!");

      if (profile.role === "ADMIN") {
        navigate("/admin/dashboard", {
          replace: true,
        });
      } else {
        navigate("/trainee/dashboard", {
          replace: true,
        });
      }
    } catch (error) {
      console.error(
        "Unexpected login error:",
        error
      );

      toast.error(
        "Something went wrong while logging in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            SkillTrack
          </h1>

          <p className="mt-2 text-slate-500">
            Post-Training Skill Gap Analytics
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}