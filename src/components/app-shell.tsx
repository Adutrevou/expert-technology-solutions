import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { LayoutDashboard, Megaphone, FileBarChart, Settings, Sun, Moon, LogOut, Activity, ShieldCheck, Bot, Mail, CheckSquare, MessagesSquare, BrainCircuit, Users, ClipboardList, MessageSquareReply, Menu } from "lucide-react";
import logo from "@/assets/expert-technology-logo.webp";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const BASE_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lead-agent", label: "Expert Lead Agent", icon: Bot },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/requests", label: "Requests", icon: ClipboardList },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/templates", label: "Templates", icon: Mail },
  { to: "/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/responses-rules", label: "Responses + Rules", icon: MessageSquareReply },
  { to: "/agent-training", label: "Agent Training", icon: BrainCircuit },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings/Admin", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, client, logout, theme, toggleTheme } = useApp();
  const router = useRouterState();
  const path = router.location.pathname;
  const isIntergraiAdmin = user?.role === "intergrai_admin";
  const navItems = BASE_NAV;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentPage = navItems.find(({ to }) => (to === "/" ? path === "/" : path.startsWith(to)));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/85 backdrop-blur lg:flex">
        <div className="flex h-24 items-center justify-center border-b border-sidebar-border/80 bg-sidebar/95 px-6">
          <img src={logo} alt="Expert Technology Solutions" className="h-12 w-auto" />
        </div>
        <div className="px-5 pt-5">
          <p className="text-xs uppercase tracking-[0.24em] text-sidebar-foreground/55">Client workspace</p>
          <p className="mt-2 text-sm text-sidebar-foreground/75">
            A clear view of what the lead system is doing, what needs approval, and what happens next.
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-smooth ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border/80 p-5">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Expert workspace live
          </div>
          <div className="mt-2 text-[11px] leading-5 text-sidebar-foreground/55">
            Outreach stays safely paused until launch approval
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-18 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4 md:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex h-10 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3">
                <span className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white overflow-hidden" style={{ backgroundColor: client.logoUrl ? "transparent" : client.brandColor }}>
                  {client.logoUrl ? (
                    <img src={client.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : client.initials}
                </span>
                <span className="truncate max-w-[150px] text-sm font-medium sm:max-w-[180px]">{client.companyName}</span>
              </div>
              {currentPage ? (
                <div className="min-w-0 lg:hidden">
                  <p className="truncate text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
                  <p className="truncate text-sm font-medium">{currentPage.label}</p>
                </div>
              ) : null}
              <Badge variant="outline" className="hidden gap-1 text-[10px] md:inline-flex">
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

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
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

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-r-[28px] border-sidebar-border/80 bg-sidebar/95 p-0 text-sidebar-foreground">
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center border-b border-sidebar-border/80 px-5">
                <img src={logo} alt="Expert Technology Solutions" className="h-10 w-auto" />
              </div>
              <SheetHeader className="px-5 py-5 text-left">
                <SheetTitle className="text-sidebar-foreground">Expert workspace</SheetTitle>
                <SheetDescription className="text-sidebar-foreground/70">
                  Mobile navigation for campaigns, approvals, outreach, and reporting.
                </SheetDescription>
              </SheetHeader>
              <nav className="flex-1 space-y-1 px-3 pb-5">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const active = to === "/" ? path === "/" : path.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-smooth ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/75 hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-sidebar-border/80 px-5 py-4 text-xs text-sidebar-foreground/65">
                Outreach stays paused until launch approval. Auto-replies remain off.
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">{children}</main>
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
