import { createFileRoute } from "@tanstack/react-router";

const UPSTREAM = "https://api.intergrai.co.za";

// Same-origin proxy for the Intergrai Auth API. Browser calls
// `/api/auth/<path>` to avoid CORS on preview/published Lovable origins.
async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const path = params._splat ?? "";
  const search = new URL(request.url).search;
  const target = `${UPSTREAM}/auth/${path}${search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  const ct = request.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(target, init);
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
      { ok: false, error: "Upstream auth request failed", target, message: e?.message ?? String(e) },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      DELETE: proxy,
    },
  },
} as any);
