import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

interface GmailHeader { name: string; value: string }
interface GmailPayload {
  headers?: GmailHeader[];
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPayload[];
}
interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPayload;
}

function decodeBase64Url(data: string): string {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    if (typeof atob === "function") {
      const bin = atob(b64 + pad);
      // decode utf-8
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return Buffer.from(b64 + pad, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload?: GmailPayload): string {
  if (!payload) return "";
  // Prefer text/plain
  const findPart = (p: GmailPayload, mime: string): GmailPayload | null => {
    if (p.mimeType === mime && p.body?.data) return p;
    if (p.parts) {
      for (const child of p.parts) {
        const found = findPart(child, mime);
        if (found) return found;
      }
    }
    return null;
  };
  const plain = findPart(payload, "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = findPart(payload, "text/html");
  if (html?.body?.data) {
    const raw = decodeBase64Url(html.body.data);
    // strip tags for preview
    return raw.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

function header(payload: GmailPayload | undefined, name: string): string {
  const h = payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

export const Route = createFileRoute("/api/gmail/messages")({
  // Server route handler — `server` key isn't in this version's option types yet,
  // but the router plugin understands it at build time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: ({
    handlers: {
      GET: async ({ request }: { request: Request }) => {

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) {
          return Response.json({ error: "LOVABLE_API_KEY is not configured" }, { status: 500 });
        }
        const GMAIL_KEY = process.env.GOOGLE_MAIL_API_KEY;
        if (!GMAIL_KEY) {
          return Response.json({ error: "GOOGLE_MAIL_API_KEY is not configured" }, { status: 500 });
        }

        const url = new URL(request.url);
        const box = url.searchParams.get("box") === "sent" ? "SENT" : "INBOX";
        const max = Math.min(Number(url.searchParams.get("max") ?? "12") || 12, 25);

        try {
          // 1) List message ids
          const listRes = await fetch(
            `${GATEWAY_URL}/users/me/messages?maxResults=${max}&labelIds=${box}`,
            {
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": GMAIL_KEY,
              },
            },
          );
          const listJson: any = await listRes.json();
          if (!listRes.ok) {
            return Response.json(
              { error: `Gmail list failed [${listRes.status}]`, details: listJson },
              { status: listRes.status },
            );
          }
          const ids: { id: string }[] = listJson.messages ?? [];
          if (ids.length === 0) {
            return Response.json({ messages: [], box });
          }

          // 2) Fetch metadata + snippet for each (parallel)
          const results = await Promise.all(
            ids.map(async ({ id }) => {
              const r = await fetch(`${GATEWAY_URL}/users/me/messages/${id}?format=full`, {
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "X-Connection-Api-Key": GMAIL_KEY,
                },
              });
              if (!r.ok) return null;
              const m: GmailMessage = await r.json();
              const subject = header(m.payload, "Subject");
              const from = header(m.payload, "From");
              const to = header(m.payload, "To");
              const date = header(m.payload, "Date");
              const body = extractBody(m.payload).slice(0, 1200);
              return {
                id: m.id,
                threadId: m.threadId,
                snippet: m.snippet ?? "",
                subject,
                from,
                to,
                date,
                internalDate: m.internalDate,
                labelIds: m.labelIds ?? [],
                unread: (m.labelIds ?? []).includes("UNREAD"),
                body,
              };
            }),
          );

          return Response.json({
            box,
            messages: results.filter(Boolean),
          });
        } catch (e: any) {
          return Response.json(
            { error: "Gmail request failed", message: e?.message ?? String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
