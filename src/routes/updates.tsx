import { createFileRoute } from "@tanstack/react-router";
import { BotMessageSquare } from "lucide-react";
import { ClientReadyPlaceholder } from "@/components/client-ready-placeholder";

export const Route = createFileRoute("/updates")({
  head: () => ({ meta: [{ title: "Agent Chat — Expert Technology Solutions" }] }),
  component: AgentChatPage,
});

function AgentChatPage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Agent Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct client-to-agent chat is not enabled in this frontend yet.
        </p>
      </header>

      <ClientReadyPlaceholder
        icon={BotMessageSquare}
        eyebrow="Messaging Onboarding"
        title="Agent chat is coming soon"
        description="This portal does not currently provide a live chat channel with the Intergrai agent. That prevents unfinished messaging features from appearing live."
        note="Questions and requests should still be routed through Intergrai until the chat workflow is connected and audited."
      />
    </div>
  );
}
