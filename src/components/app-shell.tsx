import { Link, useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { LayoutDashboard, Users, Megaphone, FileBarChart, Settings, Sun, Moon, LogOut, Activity, ShieldCheck, ClipboardList, Bot, Mail, CheckSquare } from "lucide-react";
import logo from "@/assets/expert-technology-logo.webp";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const BASE_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lead-agent", label: "Expert Lead Agent", icon: Bot },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/requests", label: "Requests", icon: ClipboardList },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/templates", label: "Templates", icon: Mail },
  { to: "/reports", label: "Reports", icon: FileBarChart },
] as const;

const ADMIN_NAV = [
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, client, logout, theme, toggleTheme } = useApp();
  const router = useRouterState();
  const path = router.location.pathname;
  const isIntergraiAdmin = user?.role === "intergrai_admin";
  const navItems = isIntergraiAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-20 items-center justify-center px-6 border-b border-sidebar-border bg-white">
          <img src={logo} alt="Expert Technology Solutions" className="h-12 w-auto" />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-smooth ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Client workspace live
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Outreach stays safely paused until launch approval
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-4 md:px-8 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card">
                <span className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white overflow-hidden" style={{ backgroundColor: client.logoUrl ? "transparent" : client.brandColor }}>
                  {client.logoUrl ? (
                    <img src={client.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : client.initials}
                </span>
                <span className="hidden sm:inline truncate max-w-[180px] text-sm font-medium">{client.companyName}</span>
              </div>
              <Badge variant="outline" className="hidden md:inline-flex gap-1 text-[10px]">
                <Activity className="h-3 w-3" />
                Intergrai portal
              </Badge>
              {isIntergraiAdmin ? (
                <Badge variant="secondary" className="hidden md:inline-flex gap-1 text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  Intergrai admin
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-9 px-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="hidden md:flex flex-col leading-tight items-start">
                      <span className="text-xs font-medium">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRoleLabel(user?.role)}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="lg:hidden flex overflow-x-auto gap-1 px-4 py-2 border-b border-border bg-background/60">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-smooth ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function formatRoleLabel(role?: string) {
  switch (role) {
    case "client_owner":
      return "Client owner";
    case "manager":
      return "Manager";
    case "sales_user":
      return "Sales user";
    case "viewer":
      return "Viewer";
    case "intergrai_admin":
      return "Intergrai admin";
    case "system_agent":
      return "System agent";
    default:
      return "Portal user";
  }
}
