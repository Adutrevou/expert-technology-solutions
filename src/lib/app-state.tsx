import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/expert-technology-logo.webp";
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from "@/lib/auth-api";
import type { Client } from "./demo-data";

export interface Targeting {
  industries: string[];
  countries: string[];
  roles: string[];
}

export interface ClientWithTargeting extends Client {
  targeting: Targeting;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const DEFAULT_TARGETING: Targeting = {
  industries: ["Logistics", "Biotech", "Cloud", "Healthcare", "Manufacturing"],
  countries: ["US", "UK", "Canada", "Germany"],
  roles: ["CEO", "VP Sales", "COO", "Founder"],
};

interface AppState {
  authStatus: AuthStatus;
  authError: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  client: ClientWithTargeting;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

const PORTAL_CLIENT: ClientWithTargeting = {
  id: "expert-technology-solutions",
  companyName: "Expert Technology Solutions",
  brandColor: "#178a8e",
  initials: "ET",
  logoUrl: logo,
  targeting: { ...DEFAULT_TARGETING },
};

const STORAGE_KEYS = {
  token: "ets-auth-token",
  user: "ets-auth-user",
  theme: "intergrai-theme",
} as const;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = (localStorage.getItem(STORAGE_KEYS.theme) as "light" | "dark") || "light";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function restoreSession() {
      const storedToken = localStorage.getItem(STORAGE_KEYS.token);
      const storedUser = localStorage.getItem(STORAGE_KEYS.user);

      if (!storedToken) {
        if (!cancelled) {
          setUser(null);
          setAuthStatus("unauthenticated");
          setAuthError(null);
        }
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          if (!cancelled) setUser(parsedUser);
        } catch {
          localStorage.removeItem(STORAGE_KEYS.user);
        }
      }

      try {
        const me = await getMe(storedToken);
        if (cancelled) return;
        persistSession(storedToken, me);
        setUser(me);
        setAuthStatus("authenticated");
        setAuthError(null);
      } catch (error) {
        if (cancelled) return;
        clearStoredSession();
        queryClient.clear();
        setUser(null);
        setAuthStatus("unauthenticated");
        setAuthError(toMessage(error));
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const login = async (email: string, password: string) => {
    setAuthStatus("loading");
    setAuthError(null);

    try {
      const result = await loginRequest(email, password);
      const nextUser = result.user ?? (await getMe(result.token));
      persistSession(result.token, nextUser);
      queryClient.clear();
      setUser(nextUser);
      setAuthStatus("authenticated");
    } catch (error) {
      clearStoredSession();
      queryClient.clear();
      setUser(null);
      setAuthStatus("unauthenticated");
      const message = toMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    const token = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEYS.token);

    if (token) {
      await logoutRequest(token);
    }

    clearStoredSession();
    queryClient.clear();
    setUser(null);
    setAuthError(null);
    setAuthStatus("unauthenticated");
  };

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem(STORAGE_KEYS.theme, t);
  };

  return (
    <Ctx.Provider
      value={{
        authStatus,
        authError,
        isAuthenticated: authStatus === "authenticated" && !!user,
        user,
        client: PORTAL_CLIENT,
        login,
        logout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppStateProvider");
  return ctx;
}

function persistSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.token, token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function toMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Authentication failed.";
}
