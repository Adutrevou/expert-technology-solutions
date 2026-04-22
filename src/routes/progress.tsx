import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateProgress } from "@/lib/demo-data";
import { Check, Circle } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress — Apollo Vision" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const phases = useMemo(() => generateProgress(), []);
  const totalTasks = phases.reduce((a, p) => a + p.tasks.length, 0);
  const doneTasks = phases.reduce((a, p) => a + p.tasks.filter((t) => t.done).length, 0);
  const overall = Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Progress tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">{doneTasks} of {totalTasks} tasks complete</p>
      </header>

      <Card className="p-6 shadow-card bg-gradient-subtle">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Overall completion</p>
            <p className="font-display text-4xl font-bold mt-1 tabular-nums">{overall}%</p>
          </div>
          <p className="text-sm text-muted-foreground">{phases.length} phases</p>
        </div>
        <Progress value={overall} className="h-2" />
      </Card>

      <div className="space-y-4">
        {phases.map((p, idx) => {
          const done = p.tasks.filter((t) => t.done).length;
          const pct = Math.round((done / p.tasks.length) * 100);
          return (
            <Card key={p.id} className="p-6 shadow-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-display font-bold ${pct === 100 ? "bg-success text-success-foreground" : "bg-gradient-primary text-primary-foreground"}`}>
                    {pct === 100 ? <Check className="h-5 w-5" /> : idx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-xl font-bold tabular-nums">{pct}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{done}/{p.tasks.length}</p>
                </div>
              </div>
              <Progress value={pct} className="h-1.5 mb-4" />
              <ul className="space-y-2">
                {p.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {t.done ? <Check className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
