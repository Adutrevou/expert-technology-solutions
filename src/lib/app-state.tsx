import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CLIENTS as SEED_CLIENTS, type Client } from "./demo-data";

type Role = "super_admin" | "client_user";

export interface Targeting {
  industries: string[];
  countries: string[];
  roles: string[];
}

export interface ClientWithTargeting extends Client {
  targeting: Targeting;
}

const DEFAULT_TARGETING: Targeting = {
  industries: ["Logistics", "Biotech", "Cloud", "Healthcare", "Manufacturing"],
  countries: ["US", "UK", "Canada", "Germany"],
  roles: ["CEO", "VP Sales", "COO", "Founder"],
};

interface AppState {
  user: { name: string; email: string; role: Role } | null;
  client: ClientWithTargeting;
  setClientId: (id: string) => void;
  clients: ClientWithTargeting[];
  addClient: (input: { companyName: string; brandColor: string; initials: string }) => void;
  updateClient: (id: string, patch: Partial<Omit<ClientWithTargeting, "id">>) => void;
  updateTargeting: (id: string, targeting: Targeting) => void;
  login: (email: string) => void;
  logout: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Ctx = createContext<AppState | null>(null);

const INITIAL_CLIENTS: ClientWithTargeting[] = SEED_CLIENTS.map((c) => ({
  ...c,
  targeting: { ...DEFAULT_TARGETING },
}));

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientWithTargeting[]>(INITIAL_CLIENTS);
  const [clientId, setClientIdState] = useState(INITIAL_CLIENTS[0].id);
  const [user, setUser] = useState<AppState["user"]>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("apollo-user");
    if (stored) setUser(JSON.parse(stored));
    const t = (localStorage.getItem("apollo-theme") as "light" | "dark") || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    const storedClients = localStorage.getItem("apollo-clients");
    if (storedClients) {
      try {
        const parsed = JSON.parse(storedClients) as ClientWithTargeting[];
        if (Array.isArray(parsed) && parsed.length) setClients(parsed);
      } catch {
        // ignore
      }
    }
    const c = localStorage.getItem("apollo-client");
    if (c) setClientIdState(c);
  }, []);

  const persistClients = (next: ClientWithTargeting[]) => {
    setClients(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("apollo-clients", JSON.stringify(next));
    }
  };

  const login = (email: string) => {
    const role: Role = email.toLowerCase().includes("admin") ? "super_admin" : "client_user";
    const u = { name: email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()), email, role };
    setUser(u);
    localStorage.setItem("apollo-user", JSON.stringify(u));
    if (role === "client_user") {
      const domain = email.split("@")[1]?.toLowerCase() ?? "";
      const matched =
        clients.find((c) => domain && (c.companyName.toLowerCase().includes(domain.split(".")[0]) || c.id.toLowerCase() === domain.split(".")[0])) ||
        clients[0];
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

  const addClient: AppState["addClient"] = ({ companyName, brandColor, initials }) => {
    const id = `client-${Date.now()}`;
    const next: ClientWithTargeting = {
      id,
      companyName,
      brandColor,
      initials: initials.slice(0, 3).toUpperCase(),
      targeting: { ...DEFAULT_TARGETING },
    };
    persistClients([...clients, next]);
  };

  const updateClient: AppState["updateClient"] = (id, patch) => {
    persistClients(clients.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateTargeting: AppState["updateTargeting"] = (id, targeting) => {
    persistClients(clients.map((c) => (c.id === id ? { ...c, targeting } : c)));
  };

  const client = clients.find((c) => c.id === clientId) || clients[0];

  return (
    <Ctx.Provider value={{ user, client, setClientId, clients, addClient, updateClient, updateTargeting, login, logout, theme, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppStateProvider");
  return ctx;
}
