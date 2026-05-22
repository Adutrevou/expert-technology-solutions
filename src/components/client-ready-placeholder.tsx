import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export function ClientReadyPlaceholder({
  icon: Icon,
  eyebrow,
  title,
  description,
  note,
  action,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="max-w-3xl mx-auto p-8 md:p-10 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      {note ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          {note}
        </div>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap gap-3">{action}</div> : null}
    </Card>
  );
}

export function PlaceholderAction({
  children,
  href,
  variant = "default",
}: {
  children: ReactNode;
  href: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button asChild variant={variant}>
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    </Button>
  );
}
