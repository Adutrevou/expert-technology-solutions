import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/expert-technology-logo.webp";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    login(email);
    navigate({ to: redirect || "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle" />
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl bg-primary-glow" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <img src={logo} alt="Expert Technology Solutions" className="h-20 w-auto mb-3" />
          <p className="text-xs text-muted-foreground">Client Visibility Portal</p>
        </div>

        <Card className="p-8 shadow-elegant border-border/50 backdrop-blur-xl bg-card/80">
          <h2 className="text-2xl font-bold mb-1">Portal access</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Production authentication is still being finalized. Use your email to open this client portal session.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary shadow-glow hover:opacity-90 transition-smooth h-11">
              Continue to portal <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            This is a temporary access gate only. No demo credentials are provided here, and production sign-in should replace this flow before long-term client rollout.
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
