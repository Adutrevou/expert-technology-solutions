import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Expert Lead Agent - Expert Technology Solutions" }] }),
  component: AgentPlaceholderPage,
  errorComponent: AgentPlaceholderError,
});

function AgentPlaceholderPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-300">Powered by Intergrai</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Expert Lead Agent</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200">
            Internal preview disabled while login and requests are being finalised.
          </p>
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-300/10 px-4 py-4 text-sm text-amber-100">
            This route is intentionally isolated from live request handling during go-live stabilisation.
          </div>
          {/* TODO: Re-enable the full request UI on /agent after login/auth is complete and the request flow is finalized. */}
        </section>
      </div>
    </div>
  );
}

function AgentPlaceholderError() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-300">Powered by Intergrai</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Expert Lead Agent</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200">
            Internal preview disabled while login and requests are being finalised.
          </p>
        </section>
      </div>
    </div>
  );
}
