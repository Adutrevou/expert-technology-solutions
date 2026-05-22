import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ClientReadyPlaceholder } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Requests — Expert Technology Solutions" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client requests are not being captured directly in this portal yet.
        </p>
      </header>

      <ClientReadyPlaceholder
        icon={ClipboardList}
        eyebrow="Request Queue"
        title="Request tracking is coming soon"
        description="No live request queue is connected to this frontend yet, so this page shows a safe placeholder instead of demo tasks or fake statuses."
        note="Until the request system is connected, change requests and operational asks should be logged through the Intergrai team."
      />
    </div>
  );
}
