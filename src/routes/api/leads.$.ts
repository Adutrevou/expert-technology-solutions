import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://api.intergrai.co.za";

// Server-side proxy for the Intergrai Leads API. The browser calls
// `/api/leads/<path>` (same-origin), and this handler forwards to the
// upstream API. This sidesteps any CORS restriction on the preview
// origin while keeping production behaviour unchanged.
export const Route = createFileRoute("/api/leads/$")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { _splat?: string } }) => {
        const path = params._splat ?? "";
        const search = new URL(request.url).search;
        const target = `${UPSTREAM}/${path}${search}`;
        try {
          const upstream = await fetch(target, {
            headers: { Accept: "application/json" },
          });
          const body = await upstream.text();
          return new Response(body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (e: any) {
          return Response.json(
            { ok: false, error: "Upstream request failed", target, message: e?.message ?? String(e) },
            { status: 502 },
          );
        }
      },
    },
  },
} as any);
