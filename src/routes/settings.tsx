import { createFileRoute } from "@tanstack/react-router";
import { Settings, ShieldCheck } from "lucide-react";
import { ClientReadyPlaceholder, PlaceholderAction } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Expert Technology Solutions" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account administration is being onboarded through Intergrai and is not managed from this frontend yet.
        </p>
      </header>

      <ClientReadyPlaceholder
        icon={Settings}
        eyebrow="Admin Onboarding"
        title="Settings and user management are coming soon"
        description="This portal does not currently expose live user administration, workspace settings, or authentication controls. That avoids showing misleading connected states before the backend access model is finalized."
        note="For now, access requests, user changes, and configuration updates should be handled through Intergrai."
        action={
          <>
            <PlaceholderAction href="https://experttechnologysolutions.intergrai.co.za">
              Open live portal
            </PlaceholderAction>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              No secrets or worker keys are exposed in this UI
            </div>
          </>
        }
      />
    </div>
  );
}
