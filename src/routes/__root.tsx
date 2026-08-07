import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AppStateProvider, useApp } from "@/lib/app-state";
import { AppShell } from "@/components/app-shell";
import { AppQueryProvider } from "@/lib/query-provider";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Expert Technology Solutions" },
      { name: "description", content: "Client visibility portal for Expert Technology Solutions outreach campaigns, leads, replies, meetings, and progress at a glance." },
      { property: "og:title", content: "Expert Technology Solutions" },
      { name: "twitter:title", content: "Expert Technology Solutions" },
      { property: "og:description", content: "Client visibility portal for Expert Technology Solutions outreach campaigns, leads, replies, meetings, and progress at a glance." },
      { name: "twitter:description", content: "Client visibility portal for Expert Technology Solutions outreach campaigns, leads, replies, meetings, and progress at a glance." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DjVwXhIqtjVoOvd3jyZMC6PFkvw1/social-images/social-1779262454286-expert-technology-logo.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/DjVwXhIqtjVoOvd3jyZMC6PFkvw1/social-images/social-1779262454286-expert-technology-logo.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppQueryProvider>
      <AppStateProvider>
        <Gate />
        <Toaster richColors />
      </AppStateProvider>
    </AppQueryProvider>
  );
}

function Gate() {
  const { authStatus, isAuthenticated, isInternalAdmin } = useApp();
  const router = useRouterState();
  const navigate = useNavigate();
  const path = router.location.pathname;
  const isPublicAuthPath = path === "/login" || path === "/forgot-password" || path === "/reset-password";
  const isInternalOnlyPath = path === "/ai-agent-status" || path === "/opportunity-watch";

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!isAuthenticated && !isPublicAuthPath) navigate({ to: "/login", replace: true });
    if (isAuthenticated && isPublicAuthPath) navigate({ to: "/", replace: true });
    if (isAuthenticated && isInternalOnlyPath && !isInternalAdmin) navigate({ to: "/", replace: true });
  }, [authStatus, isAuthenticated, isInternalAdmin, isInternalOnlyPath, isPublicAuthPath, navigate]);

  if (authStatus === "loading") {
    return <LoadingGate />;
  }

  if (isAuthenticated && isPublicAuthPath) {
    return <LoadingGate />;
  }

  if (isAuthenticated && isInternalOnlyPath && !isInternalAdmin) {
    return <LoadingGate />;
  }

  if (isPublicAuthPath) return <Outlet />;
  if (!isAuthenticated) return <LoadingGate />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LoadingGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 text-center shadow-card backdrop-blur">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <h1 className="mt-5 text-xl font-semibold">Checking your portal session</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading Expert Technology Solutions access.
        </p>
      </div>
    </div>
  );
}
