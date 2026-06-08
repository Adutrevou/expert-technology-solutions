import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Loader2, LockKeyhole, Mail, RefreshCcw, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { changePassword } from "@/lib/auth-api";
import { useLeadAgentSummaryQuery, useMicrosoftReplySyncStatusQuery, useStartMicrosoftReplySyncOAuthMutation } from "@/lib/leads-api-hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro } from "@/components/client-portal";
import type { LeadAgentSummary } from "@/lib/leads-api";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Expert Technology Solutions" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useApp();
  const summaryQuery = useLeadAgentSummaryQuery();
  const statusQuery = useMicrosoftReplySyncStatusQuery();
  const startMutation = useStartMicrosoftReplySyncOAuthMutation();
  const canManageMailbox = ["client_owner", "manager", "intergrai_admin"].includes(user?.role || "");
  const connectionState = getConnectionState(statusQuery.data);
  const readiness = useMemo(() => getReadinessSummary(summaryQuery.data), [summaryQuery.data]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleConnectClick() {
    const result = await startMutation.mutateAsync();
    if (result.authUrl && typeof window !== "undefined") {
      window.location.assign(result.authUrl);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (newPassword.length < 10) {
      setPasswordError("Use at least 10 characters for the new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The password confirmation does not match.");
      return;
    }

    const token = typeof window === "undefined" ? "" : localStorage.getItem("ets-auth-token") || "";
    if (!token) {
      setPasswordError("Your session has expired. Sign in again and retry the password change.");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(token, currentPassword, newPassword);
      setPasswordNotice("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("We could not update the password. Check the current password and try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <PageIntro
        badge="Settings"
        title="How is access and safety configured?"
        description="Manage account details, password changes, mailbox status, reply sync, and launch safety in one practical place."
        actions={(
          <Button variant="outline" onClick={() => { void statusQuery.refetch(); void summaryQuery.refetch(); }}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh status
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StateCard label="Campaigns" value={readiness.campaigns} tone={readiness.campaignsTone} />
        <StateCard label="Templates" value={readiness.templates} tone={readiness.templatesTone} />
        <StateCard label="Mailbox" value={readiness.mailbox} tone={readiness.mailboxTone} />
        <StateCard label="Sending" value={readiness.sending} tone={readiness.sendingTone} />
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Microsoft reply sync</h2>
                <p className="text-sm text-muted-foreground">
                  Connect the reply-sync mailbox without enabling outbound sending.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={connectionState.tone}>{connectionState.label}</Badge>
              {statusQuery.isFetching ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking status
                </span>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">{connectionState.detail}</p>
            <p className="text-sm text-muted-foreground">
              Reply sync and mailbox connectivity are visible here. Outbound sending remains paused until an explicit launch decision.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {canManageMailbox ? (
              <Button onClick={handleConnectClick} disabled={startMutation.isPending}>
                {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Microsoft mailbox
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => { void statusQuery.refetch(); void summaryQuery.refetch(); }} disabled={statusQuery.isFetching || summaryQuery.isFetching}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh status
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Reply sync only. Sending remains disabled.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your portal password without involving Intergrai support.
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <PasswordInput
              id="current-password"
              label="Current password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={setCurrentPassword}
            />
            <PasswordInput
              id="new-password"
              label="New password"
              value={newPassword}
              autoComplete="new-password"
              onChange={setNewPassword}
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={setConfirmPassword}
            />

            {passwordNotice ? <Message tone="success">{passwordNotice}</Message> : null}
            {passwordError ? <Message tone="error">{passwordError}</Message> : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating password..." : "Save password"}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link to="/forgot-password">Request reset link</Link>
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6 shadow-card">
          <h2 className="text-xl font-semibold">Launch guardrails</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What is ready now, what still needs approval, and what stays blocked until launch.
          </p>

          <div className="mt-5 space-y-3">
            <ReadinessRow label="Client-visible approvals" value={`${summaryQuery.data?.approvalsWaiting ?? 0} waiting`} />
            <ReadinessRow label="Mailbox connected" value={summaryQuery.data?.mailboxConnected ? "Yes" : "No"} />
            <ReadinessRow label="Reply sync connected" value={statusQuery.data?.connected ? "Yes" : "No"} />
            <ReadinessRow label="Sending enabled" value={summaryQuery.data?.sendingEnabled ? "Yes" : "No"} />
            <ReadinessRow label="Prepared outreach" value={`${summaryQuery.data?.clientFacingCounts.outreachPrepared ?? 0}`} />
            <ReadinessRow label="Emails sent" value={`${summaryQuery.data?.clientFacingCounts.emailsSent ?? 0}`} />
          </div>

          <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
            Sending is paused until approvals are complete and launch is explicitly started. No auto-replies are enabled here.
          </div>
        </Card>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="pl-9"
          autoComplete={autoComplete}
        />
      </div>
    </div>
  );
}

function Message({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const className = tone === "success"
    ? "border-success/20 bg-success/10 text-success"
    : "border-destructive/20 bg-destructive/10 text-destructive";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{children}</div>;
}

function StateCard({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "muted" }) {
  const className = tone === "success"
    ? "border-success/20 bg-success/10 text-success"
    : tone === "warning"
      ? "border-warning/30 bg-warning/10 text-warning-foreground"
      : "border-border/70 bg-background text-foreground";

  return (
    <Card className={`p-5 shadow-card ${className}`}>
      <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function getConnectionState(status?: {
  connected: boolean;
  signedInMailbox: string;
  mailboxEmail: string;
  credentialsStored: boolean;
  configured: boolean;
}) {
  if (!status) {
    return {
      label: "Not connected",
      tone: "outline" as const,
      detail: "Microsoft reply sync has not been connected yet.",
    };
  }

  if (status.connected) {
    const mailbox = status.signedInMailbox || status.mailboxEmail;
    return {
      label: `Connected as ${mailbox}`,
      tone: "default" as const,
      detail: "Reply sync reads replies from this mailbox only. Sending stays disabled.",
    };
  }

  if (status.credentialsStored || status.configured) {
    return {
      label: "Reconnect required",
      tone: "secondary" as const,
      detail: "Microsoft needs this mailbox to sign in again before reply sync can resume.",
    };
  }

  return {
    label: "Not connected",
    tone: "outline" as const,
    detail: "Microsoft reply sync has not been connected yet.",
  };
}

function getReadinessSummary(summary?: LeadAgentSummary) {
  const pendingCampaigns = summary?.campaigns.filter((campaign) => campaign.approvalStatus !== "approved").length ?? 0;
  const pendingTemplates = [
    ...(summary?.outreachTemplates ?? []).filter((template) => template.approvalStatus !== "approved"),
    ...(summary?.followupSequences ?? []).filter((sequence) => sequence.approvalStatus !== "approved"),
  ].length;

  return {
    campaigns: pendingCampaigns === 0 ? "Approved" : `${pendingCampaigns} waiting`,
    campaignsTone: pendingCampaigns === 0 ? "success" : "warning",
    templates: pendingTemplates === 0 ? "Approved" : `${pendingTemplates} waiting`,
    templatesTone: pendingTemplates === 0 ? "success" : "warning",
    mailbox: summary?.mailboxConnected ? "Connected" : "Not connected",
    mailboxTone: summary?.mailboxConnected ? "success" : "warning",
    sending: summary?.sendingEnabled ? "Enabled" : "Paused",
    sendingTone: summary?.sendingEnabled ? "warning" : "success",
  } as const;
}
