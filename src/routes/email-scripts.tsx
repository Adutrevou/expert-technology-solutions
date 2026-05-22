import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { ClientReadyPlaceholder } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/email-scripts")({
  head: () => ({ meta: [{ title: "Outreach Scripts — Expert Technology Solutions" }] }),
  component: OutreachScriptsPage,
});

function OutreachScriptsPage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Outreach Scripts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Script management is not yet exposed as a client-facing feature in this portal.
        </p>
      </header>

      <ClientReadyPlaceholder
        icon={Mail}
        eyebrow="Internal Workflow"
        title="Script editing is not available in the client portal"
        description="This area previously presented internal demo tooling. It now stays intentionally disabled until a client-safe script review workflow is connected."
        note="If script review or approvals are needed, they should be managed through Intergrai rather than through this frontend."
      />
    </div>
  );
}
