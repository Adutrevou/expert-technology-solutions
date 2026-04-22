import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Send, RefreshCw, Mail, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GmailMessageDTO {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  internalDate?: string;
  labelIds: string[];
  unread: boolean;
  body: string;
}

function parseAddr(raw: string): { name: string; email: string } {
  if (!raw) return { name: "Unknown", email: "" };
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2], email: m[2] };
  return { name: raw, email: raw };
}

export function GmailLiveInbox() {
  const [box, setBox] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<GmailMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (which: "inbox" | "sent") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gmail/messages?box=${which}&max=12`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setMessages(json.messages ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load Gmail messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(box);
  }, [box]);

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="p-5 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Live Gmail
                <Badge variant="secondary" className="text-[10px] uppercase">Demo account</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Real messages from the shared outreach inbox · refresh to pull the latest
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => load(box)} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={box} onValueChange={(v) => setBox(v as "inbox" | "sent")} className="p-5 space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Inbox</TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Sent</TabsTrigger>
        </TabsList>

        <TabsContent value={box} className="space-y-2">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-destructive">Couldn't load Gmail</div>
                <div className="text-xs text-muted-foreground mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {loading && messages.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No messages in {box === "inbox" ? "the inbox" : "Sent"}.
            </div>
          )}

          {messages.map((m) => {
            const isOpen = expanded === m.id;
            const counterparty = box === "sent" ? parseAddr(m.to) : parseAddr(m.from);
            return (
              <div
                key={m.id}
                className={`rounded-lg border transition-smooth ${
                  isOpen ? "border-primary/60 shadow-glow" : "border-border hover:border-primary/40"
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="w-full text-left p-3 flex items-start gap-3"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground shrink-0 shadow-sm"
                    style={{ background: "var(--gradient-primary)" }}
                    title={counterparty.email}
                  >
                    {counterparty.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${m.unread ? "font-semibold" : "font-medium"}`}>
                        {counterparty.name}
                      </span>
                      {m.unread && box === "inbox" && (
                        <Badge className="text-[9px] h-4 px-1.5">New</Badge>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                        {m.date ? formatDistanceToNow(new Date(m.date), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <div className={`text-sm truncate ${m.unread ? "font-medium" : ""}`}>
                      {m.subject || "(no subject)"}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{m.snippet}</div>
                  </div>
                  <span className="shrink-0 mt-1 text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-4 pt-1 border-t border-border bg-muted/20">
                    <div className="text-[11px] text-muted-foreground mb-2 grid gap-0.5">
                      <div><span className="font-medium text-foreground">From:</span> {m.from}</div>
                      <div><span className="font-medium text-foreground">To:</span> {m.to}</div>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground/90 max-h-[400px] overflow-auto">
                      {m.body || m.snippet || "(no content)"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
