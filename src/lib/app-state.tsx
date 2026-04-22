import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CLIENTS, type Client } from "./demo-data";

type Role = "super_admin" | "client_user";

interface AppState {
  user: { name: string; email: string; role: Role } | null;
  client: Client;
  setClientId: (id: string) => void;
  clients: Client[];
  login: (email: string) => void;
  logout: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState(CLIENTS[0].id);
  const [user, setUser] = useState<AppState["user"]>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("apollo-user");
    if (stored) setUser(JSON.parse(stored));
    const t = (localStorage.getItem("apollo-theme") as "light" | "dark") || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    const c = localStorage.getItem("apollo-client");
    if (c && CLIENTS.find((x) => x.id === c)) setClientIdState(c);
  }, []);

  const login = (email: string) => {
    const role: Role = email.toLowerCase().includes("admin") ? "super_admin" : "client_user";
    const u = { name: email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()), email, role };
    setUser(u);
    localStorage.setItem("apollo-user", JSON.stringify(u));
    // Lock client users to a single client based on email domain match; fallback to first client.
    if (role === "client_user") {
      const domain = email.split("@")[1]?.toLowerCase() ?? "";
      const matched =
        CLIENTS.find((c) => domain && (c.companyName.toLowerCase().includes(domain.split(".")[0]) || c.id.toLowerCase() === domain.split(".")[0])) ||
        CLIENTS[0];
      setClientIdState(matched.id);
      localStorage.setItem("apollo-client", matched.id);
    }
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("apollo-user");
  };
  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("apollo-theme", t);
  };
  const setClientId = (id: string) => {
    setClientIdState(id);
    localStorage.setItem("apollo-client", id);
  };

  const client = CLIENTS.find((c) => c.id === clientId) || CLIENTS[0];

  return (
    <Ctx.Provider value={{ user, client, setClientId, clients: CLIENTS, login, logout, theme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppStateProvider");
  return ctx;
}
