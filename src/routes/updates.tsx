import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { generateUpdates } from "@/lib/demo-data";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/updates")({
  head: () => ({ meta: [{ title: "Updates — Expert Technology Solutions" }] }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const updates = useMemo(() => generateUpdates(), []);
  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Strategy updates</h1>
        <p className="text-sm text-muted-foreground mt-1">Latest notes and strategy changes from your account team.</p>
      </header>

      <ol className="relative border-l border-border ml-3 space-y-6">
        {updates.map((u) => (
          <li key={u.id} className="ml-6">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <MessageSquare className="h-3 w-3 text-primary-foreground" />
            </span>
            <Card className="p-5 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold">{u.title}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</span>
              </div>
              <p className="text-sm text-muted-foreground">{u.body}</p>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">— {u.author}</p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
