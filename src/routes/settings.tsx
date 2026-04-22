import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp, type Targeting } from "@/lib/app-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Key, Shield, Plus, X, UserPlus, Lock } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Apollo Vision" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { client, user, clients, addClient, updateClient, updateTargeting, setClientId } = useApp();
  const isAdmin = user?.role === "super_admin";

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Settings unavailable</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This area is restricted to administrators. Please contact your account manager for changes.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage branding, targeting, clients, and integrations.</p>
      </header>

      <BrandingCard clientId={client.id} initialName={client.companyName} initialColor={client.brandColor} initials={client.initials} onSave={updateClient} />

      <TargetingCard clientId={client.id} targeting={client.targeting} onSave={updateTargeting} />

      <ClientsCard clients={clients} currentId={client.id} onAdd={addClient} onSwitch={setClientId} />

      <Card className="p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow flex-shrink-0">
            <Key className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Apollo.io integration</h2>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Currently using <span className="font-mono text-foreground">demo data</span>. Connect Apollo to sync live leads, campaigns, and replies every 6 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Paste your Apollo API key…" className="font-mono text-xs" />
              <Button className="bg-gradient-primary shadow-glow gap-2">
                <Sparkles className="h-4 w-4" /> Connect
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Keys are stored securely and never shared with clients.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function BrandingCard({ clientId, initialName, initialColor, initials, onSave }: {
  clientId: string;
  initialName: string;
  initialColor: string;
  initials: string;
  onSave: (id: string, patch: { companyName?: string; brandColor?: string }) => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  useEffect(() => { setName(initialName); setColor(initialColor); }, [clientId, initialName, initialColor]);

  const dirty = name !== initialName || color !== initialColor;

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-semibold mb-1">Client branding</h2>
          <p className="text-xs text-muted-foreground">How {initialName} appears in the portal.</p>
        </div>
        {dirty && (
          <Button size="sm" onClick={() => { onSave(clientId, { companyName: name.trim() || initialName, brandColor: color }); toast.success("Branding updated"); }}>
            Save
          </Button>
        )}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Company name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Primary brand color</Label>
          <div className="flex gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded-md border border-input bg-transparent cursor-pointer" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: color }}>
              {initials}
            </div>
            <Button variant="outline">Upload logo</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TargetingCard({ clientId, targeting, onSave }: {
  clientId: string;
  targeting: Targeting;
  onSave: (id: string, t: Targeting) => void;
}) {
  const [local, setLocal] = useState<Targeting>(targeting);
  useEffect(() => setLocal(targeting), [clientId, targeting]);

  const dirty = useMemo(() => JSON.stringify(local) !== JSON.stringify(targeting), [local, targeting]);

  const update = (key: keyof Targeting, values: string[]) => setLocal((p) => ({ ...p, [key]: values }));

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-semibold mb-1">Campaign targeting</h2>
          <p className="text-xs text-muted-foreground">Industries, countries, and roles being targeted for this client.</p>
        </div>
        {dirty && (
          <Button size="sm" onClick={() => { onSave(clientId, local); toast.success("Targeting updated"); }}>
            Save changes
          </Button>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <TagEditor label="Industries" placeholder="Add industry…" values={local.industries} onChange={(v) => update("industries", v)} />
        <TagEditor label="Countries" placeholder="Add country…" values={local.countries} onChange={(v) => update("countries", v)} />
        <TagEditor label="Roles" placeholder="Add role…" values={local.roles} onChange={(v) => update("roles", v)} />
      </div>
    </Card>
  );
}

function TagEditor({ label, placeholder, values, onChange }: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
  };

  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-2 mb-2 min-h-7">
        {values.map((x) => (
          <Badge key={x} variant="secondary" className="gap-1 pr-1">
            {x}
            <button type="button" onClick={() => remove(x)} className="rounded-sm hover:bg-background/40 p-0.5" aria-label={`Remove ${x}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={placeholder} className="h-8 text-xs" />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ClientsCard({ clients, currentId, onAdd, onSwitch }: {
  clients: { id: string; companyName: string; brandColor: string; initials: string }[];
  currentId: string;
  onAdd: (input: { companyName: string; brandColor: string; initials: string }) => void;
  onSwitch: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [initials, setInitials] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Company name is required"); return; }
    const computedInitials = (initials.trim() || trimmed.split(/\s+/).map((w) => w[0]).join("")).slice(0, 3).toUpperCase();
    onAdd({ companyName: trimmed, brandColor: color, initials: computedInitials });
    toast.success(`${trimmed} added`);
    setName(""); setInitials(""); setColor("#6366f1");
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start gap-4 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow flex-shrink-0">
          <UserPlus className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold">Clients</h2>
          <p className="text-xs text-muted-foreground mt-1">Add new clients to the portal and switch between them.</p>
        </div>
      </div>

      <div className="grid gap-2 mb-6">
        {clients.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: c.brandColor }}>
              {c.initials}
            </span>
            <span className="text-sm font-medium flex-1">{c.companyName}</span>
            {c.id === currentId ? (
              <Badge variant="secondary" className="text-[10px]">current</Badge>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => onSwitch(c.id)} className="h-7 text-xs">
                Switch
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Add new client</p>
        <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">Company name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Initials</Label>
            <Input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="AC" maxLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-1.5">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-10 rounded-md border border-input bg-transparent cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={submit} className="gap-1.5 w-full md:w-auto">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
