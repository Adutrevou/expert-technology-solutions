import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Mail, RefreshCcw, Settings, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { useMicrosoftReplySyncStatusQuery, useStartMicrosoftReplySyncOAuthMutation } from "@/lib/leads-api-hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Expert Technology Solutions" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useApp();
  const statusQuery = useMicrosoftReplySyncStatusQuery();
  const startMutation = useStartMicrosoftReplySyncOAuthMutation();

  const connectionState = getConnectionState(statusQuery.data);

  async function handleConnectClick() {
    const result = await startMutation.mutateAsync();
    if (result.authUrl && typeof window !== "undefined") {
      window.location.assign(result.authUrl);
    }
  }

  if (user?.role !== "intergrai_admin") {
    return (
      <div className="max-w-[900px] mx-auto">
        <Card className="p-10 text-center shadow-card">
          <h1 className="text-2xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Settings are limited to Intergrai administrators in version 1.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[960px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Microsoft reply sync is connected per mailbox and kept separate from outbound sending.
        </p>
      </header>

      <Card className="p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-3">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Microsoft mailbox</h2>
                <p className="text-sm text-muted-foreground">
                  Connect the <span className="font-medium">salesleads@experttechnology.co.za</span> mailbox for reply sync.
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
              No mailbox secrets, tokens, or technical credential details are shown in this portal.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <Button onClick={handleConnectClick} disabled={startMutation.isPending}>
              {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Microsoft mailbox
            </Button>
            <Button variant="outline" onClick={() => statusQuery.refetch()} disabled={statusQuery.isFetching}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh status
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Reply sync only. Sending remains disabled.
            </div>
          </div>
        </div>

        {statusQuery.isError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {statusQuery.error instanceof Error ? statusQuery.error.message : "Unable to load Microsoft mailbox status."}
          </div>
        ) : null}
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Admin note</h2>
            <p className="text-sm text-muted-foreground">
              User administration and broader settings remain managed through Intergrai.
            </p>
          </div>
        </div>
      </Card>
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
