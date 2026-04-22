import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MeetingStatusBadge } from "@/components/status-badges";
import { generateMeetings } from "@/lib/demo-data";
import { format, isFuture } from "date-fns";
import { Calendar, Clock, Building2 } from "lucide-react";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — Apollo Vision" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { client } = useApp();
  const meetings = useMemo(() => generateMeetings(client.id).sort((a, b) => +new Date(b.meetingDate) - +new Date(a.meetingDate)), [client.id]);
  const upcoming = meetings.filter((m) => isFuture(new Date(m.meetingDate)));
  const past = meetings.filter((m) => !isFuture(new Date(m.meetingDate)));

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">{upcoming.length} upcoming · {past.length} completed</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Upcoming
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming meetings.</p>}
          {upcoming.map((m) => <MeetingCard key={m.id} m={m} highlight />)}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Past meetings</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {past.map((m) => <MeetingCard key={m.id} m={m} />)}
        </div>
      </section>
    </div>
  );
}

function MeetingCard({ m, highlight }: { m: ReturnType<typeof generateMeetings>[number]; highlight?: boolean }) {
  return (
    <Card className={`p-5 shadow-card transition-smooth hover:shadow-glow ${highlight ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{m.leadName}</h3>
          <p className="text-xs text-muted-foreground">{m.leadTitle}</p>
        </div>
        <MeetingStatusBadge status={m.status} />
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{m.leadCompany}</div>
        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{format(new Date(m.meetingDate), "EEE, MMM d")}</div>
        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{format(new Date(m.meetingDate), "p")}</div>
      </div>
    </Card>
  );
}
