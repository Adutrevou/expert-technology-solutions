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
        return forwardRequest(request, params);
      },
      POST: async ({ request, params }: { request: Request; params: { _splat?: string } }) => {
        return forwardRequest(request, params);
      },
    },
  },
} as any);

async function forwardRequest(request: Request, params: { _splat?: string }) {
  const path = params._splat ?? "";
  const search = new URL(request.url).search;
  const target = `${UPSTREAM}/${path}${search}`;

  try {
    const requestBody =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers.get("content-type") ?? "application/json",
      },
      body: requestBody,
    });
    const responseBody = await upstream.text();
    return new Response(responseBody, {
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
}
