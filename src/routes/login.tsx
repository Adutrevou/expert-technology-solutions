import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/expert-technology-logo.webp";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, authError, authStatus } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = authStatus === "loading";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);

    try {
      await login(email, password);
      navigate({ to: "/", replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle" />
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl bg-primary-glow" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <img src={logo} alt="Expert Technology Solutions" className="h-20 w-auto mb-3" />
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Powered operations</p>
          <h1 className="mt-3 text-center text-3xl font-bold">Leads Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Secure client access for Expert Technology Solutions</p>
        </div>

        <Card className="p-8 shadow-elegant border-border/50 backdrop-blur-xl bg-card/80">
          <h2 className="text-2xl font-bold mb-1">Client Portal login</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with your Intergrai-managed email and password to access the Expert Technology Solutions dashboard.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" autoComplete="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9" autoComplete="current-password" />
              </div>
            </div>

            {error || authError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error || authError}</span>
                </div>
              </div>
            ) : null}

            <Button type="submit" className="w-full bg-gradient-primary shadow-glow hover:opacity-90 transition-smooth h-11" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Login to dashboard"} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <span>Access is limited to approved Expert Technology Solutions users.</span>
            <span className="shrink-0">Powered by Intergrai</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
