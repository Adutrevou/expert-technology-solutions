import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-api";
import logo from "@/assets/expert-technology-logo.webp";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const response = await requestPasswordReset(email.trim());
      setNotice(response.message || "If that account exists, a reset link has been prepared.");
    } catch {
      setError("We could not start the password reset right now. Please try again shortly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle" />
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl bg-primary-glow" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center justify-center">
          <img src={logo} alt="Expert Technology Solutions" className="mb-3 h-20 w-auto" />
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Password recovery</p>
          <h1 className="mt-3 text-center text-3xl font-bold">Reset portal access</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Request a secure reset link for your Expert Technology Solutions client portal login.
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 p-8 shadow-elegant backdrop-blur-xl">
          <h2 className="mb-1 text-2xl font-bold">Forgot your password?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your portal email. If the account is active, a reset path will be made available.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            {notice ? <InlineMessage tone="success">{notice}</InlineMessage> : null}
            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

            <Button type="submit" className="h-11 w-full bg-gradient-primary shadow-glow hover:opacity-90 transition-smooth" disabled={submitting}>
              {submitting ? "Preparing reset..." : "Request password reset"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/60 pt-4">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary transition hover:opacity-80">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function InlineMessage({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const className = tone === "success"
    ? "border-success/20 bg-success/10 text-success"
    : "border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${className}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{children}</span>
      </div>
    </div>
  );
}
