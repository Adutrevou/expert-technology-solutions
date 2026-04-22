import { Link, useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { LayoutDashboard, Users, Megaphone, Calendar, ListChecks, FileBarChart, MessageSquare, Settings, Sparkles, Sun, Moon, LogOut, ChevronDown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const BASE_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/meetings", label: "Meetings", icon: Calendar },
  { to: "/progress", label: "Progress", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/updates", label: "Updates", icon: MessageSquare },
] as const;

const ADMIN_NAV = [{ to: "/settings", label: "Settings", icon: Settings }] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, client, clients, setClientId, logout, theme, toggleTheme } = useApp();
  const router = useRouterState();
  const path = router.location.pathname;
  const NAV = user?.role === "super_admin" ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">Apollo Vision</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Client Portal</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
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
            Apollo sync healthy
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Last updated {format(new Date(), "PP 'at' p")}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-4 md:px-8 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {user?.role === "super_admin" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-9">
                      <span className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: client.brandColor }}>
                        {client.initials}
                      </span>
                      <span className="hidden sm:inline truncate max-w-[160px]">{client.companyName}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Switch client</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {clients.map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => setClientId(c.id)} className="gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: c.brandColor }}>
                          {c.initials}
                        </span>
                        {c.companyName}
                        {c.id === client.id && <Badge variant="secondary" className="ml-auto text-[10px]">current</Badge>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-card">
                  <span className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: client.brandColor }}>
                    {client.initials}
                  </span>
                  <span className="hidden sm:inline truncate max-w-[180px] text-sm font-medium">{client.companyName}</span>
                </div>
              )}
              <Badge variant="outline" className="hidden md:inline-flex gap-1 text-[10px]">
                <Activity className="h-3 w-3" />
                Live data
              </Badge>
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
                        {user?.role === "super_admin" ? "Super Admin" : "Client"}
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
          {NAV.map(({ to, label, icon: Icon }) => {
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
