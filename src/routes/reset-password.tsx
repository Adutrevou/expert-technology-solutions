import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-api";
import logo from "@/assets/expert-technology-logo.webp";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const search = useSearch({ strict: false });
  const token = useMemo(() => {
    const value = search.token;
    return typeof value === "string" ? value.trim() : "";
  }, [search.token]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing required information. Request a new reset link.");
      return;
    }

    if (password.length < 10) {
      setError("Use at least 10 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setError(null);

    try {
      const response = await resetPassword(token, password);
      setNotice(response.message || "Password reset complete. You can sign in now.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("This reset link is invalid or has expired. Request a new password reset.");
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
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Secure reset</p>
          <h1 className="mt-3 text-center text-3xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Reset links expire and can only be used once.
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 p-8 shadow-elegant backdrop-blur-xl">
          <h2 className="mb-1 text-2xl font-bold">Reset password</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Set a strong password for your Expert Technology Solutions portal account.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <PasswordField
              id="password"
              label="New password"
              value={password}
              autoComplete="new-password"
              onChange={setPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={setConfirmPassword}
            />

            {notice ? <InlineMessage tone="success">{notice}</InlineMessage> : null}
            {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}

            <Button type="submit" className="h-11 w-full bg-gradient-primary shadow-glow hover:opacity-90 transition-smooth" disabled={submitting || !token}>
              {submitting ? "Resetting password..." : "Save new password"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/60 pt-4">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary transition hover:opacity-80">
              <ArrowLeft className="h-4 w-4" />
              Return to login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="pl-9"
          autoComplete={autoComplete}
        />
      </div>
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
