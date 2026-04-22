import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function KpiCard({ label, value, delta, icon: Icon, accent = "primary" }: {
  label: string;
  value: number;
  delta?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const accentBg = {
    primary: "bg-gradient-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden p-5 shadow-card transition-smooth hover:shadow-glow">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10 blur-2xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold tabular-nums">
              {display.toLocaleString()}
            </p>
            {delta && (
              <p className="mt-1 text-xs font-medium text-success">↑ {delta}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentBg} shadow-glow`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
