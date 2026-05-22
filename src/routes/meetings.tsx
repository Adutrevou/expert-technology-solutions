import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { ClientReadyPlaceholder, PlaceholderAction } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Approvals — Expert Technology Solutions" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approval workflows are not connected in this frontend yet.
        </p>
      </header>

      <ClientReadyPlaceholder
        icon={CheckSquare}
        eyebrow="Workflow Onboarding"
        title="Approvals are handled through Intergrai for now"
        description="This section intentionally avoids fake approve or reject actions until the client approval workflow is connected end-to-end."
        note="When an approval flow is enabled, items should appear here from the live API. At the moment, requests are logged and coordinated through Intergrai."
        action={<PlaceholderAction href="https://api.intergrai.co.za/clients/expert-technology-solutions/dashboard">View live dashboard JSON</PlaceholderAction>}
      />
    </div>
  );
}
