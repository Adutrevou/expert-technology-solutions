import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/lib/app-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Key, Shield } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Apollo Vision" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { client, user } = useApp();
  const [color, setColor] = useState(client.brandColor);
  const isAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage branding, targeting, and integrations.</p>
      </header>

      <Card className="p-6 shadow-card">
        <h2 className="font-semibold mb-1">Client branding</h2>
        <p className="text-xs text-muted-foreground mb-5">How {client.companyName} appears in the portal.</p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input defaultValue={client.companyName} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label>Primary brand color</Label>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={!isAdmin} className="h-10 w-14 rounded-md border border-input bg-transparent cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} disabled={!isAdmin} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: color }}>
                {client.initials}
              </div>
              <Button variant="outline" disabled={!isAdmin}>Upload logo</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="font-semibold mb-1">Campaign targeting</h2>
        <p className="text-xs text-muted-foreground mb-5">Industries, regions, and roles being targeted.</p>
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Industries</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["Logistics", "Biotech", "Cloud", "Healthcare", "Manufacturing"].map((x) => (
                <Badge key={x} variant="secondary">{x}</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Countries</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["US", "UK", "Canada", "Germany"].map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Roles</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {["CEO", "VP Sales", "COO", "Founder"].map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow flex-shrink-0">
            <Key className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Apollo.io integration</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Currently using <span className="font-mono text-foreground">demo data</span>. Connect Apollo to sync live leads, campaigns, and replies every 6 hours.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Paste your Apollo API key…" disabled={!isAdmin} className="font-mono text-xs" />
              <Button disabled={!isAdmin} className="bg-gradient-primary shadow-glow gap-2">
                <Sparkles className="h-4 w-4" /> Connect
              </Button>
            </div>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Read-only — only Super Admins can modify integrations.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
