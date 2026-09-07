import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = "TRAINEE" | "ADMIN";

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{
    error: Error | null;
  }>;
  register: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
  }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = async (authUser: User) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", authUser.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      setAppUser(null);
      return;
    }

    if (data) {
      setAppUser({
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role as UserRole,
      });
    }
  };

  const refreshUser = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);

    if (currentUser) {
      await fetchAppUser(currentUser);
    } else {
      setAppUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        await fetchAppUser(currentUser);
      }

      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await fetchAppUser(currentUser);
        } else {
          setAppUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      error: error ? new Error(error.message) : null,
    };
  };

  const register = async (
    fullName: string,
    email: string,
    password: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return {
      error: error ? new Error(error.message) : null,
    };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}