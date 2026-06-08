import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ApprovalStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PageIntro({
  badge,
  title,
  description,
  actions,
}: {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-[28px] border border-border/70 bg-card/90 px-4 py-5 shadow-card backdrop-blur sm:px-6 sm:py-6 md:rounded-[32px] md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {badge ? (
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              {badge}
            </Badge>
          ) : null}
          <h1 className="mt-4 text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[24px] border-border/70 p-4 shadow-card sm:p-5 md:rounded-[28px] md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="rounded-[22px] border-border/70 p-4 shadow-card sm:p-5 md:rounded-[24px]">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {detail ? <p className="mt-2 text-sm text-muted-foreground">{detail}</p> : null}
    </Card>
  );
}

export function InfoTile({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function EmptyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-muted/10 px-4 py-8 text-center sm:px-6 sm:py-10">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function SafetyBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-5 py-4 text-sm text-foreground">
      {children}
    </div>
  );
}

export function StatusMessage({
  tone,
  children,
}: {
  tone: "success" | "error" | "warning";
  children: ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-success/20 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning-foreground"
        : "border-destructive/20 bg-destructive/10 text-destructive";

  return <div className={`rounded-[20px] border px-4 py-3 text-sm ${className}`}>{children}</div>;
}

export function ApprovalStateLine({
  status,
  summary,
}: {
  status: string;
  summary: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ApprovalStatusBadge status={status} />
      <span className="text-sm text-muted-foreground">{summary}</span>
    </div>
  );
}

export function LinkedAction({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
      <Link to={to}>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}

export function formatPortalDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPortalLabel(value?: string) {
  if (!value) return "Not available";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
