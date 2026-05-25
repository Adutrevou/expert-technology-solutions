import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AppStateProvider, useApp } from "@/lib/app-state";
import { AppShell } from "@/components/app-shell";
import { AppQueryProvider } from "@/lib/query-provider";

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
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
      </AppStateProvider>
    </AppQueryProvider>
  );
}

function Gate() {
  const { user } = useApp();
  const router = useRouterState();
  const navigate = useNavigate();
  const path = router.location.pathname;
  const search = router.location.search;
  const isAgentRoute = path === "/agent";

  useEffect(() => {
    if (!user && path !== "/login") {
      const redirect = `${path}${search}`;
      navigate({
        to: "/login",
        search: { redirect: redirect !== "/" ? redirect : undefined },
      });
    }
    if (user && path === "/login") navigate({ to: "/" });
  }, [user, path, search, navigate]);

  if (path === "/login") return <Outlet />;
  if (!user) return null;
  if (isAgentRoute) return <Outlet />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
