import { useMemo, useState } from "react";
import { Check, CircuitBoard, Copy, KeyRound, Plus, Webhook } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Button, Card, CardContent, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Checkbox,
} from "@/components/ui/radix";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { API_SCOPES, INTEGRATION_PROVIDERS, WEBHOOK_EVENTS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export function IntegrationsStudio() {
  const { t } = useI18n();
  const { db, currentProfile } = useStore();
  const org = currentProfile.organization_id ?? "org_global";

  const keys = db.apiKeys.filter((k) => k.organization_id === org);
  const webhooks = db.webhooks.filter((w) => w.organization_id === org);
  const integrations = db.integrations.filter((i) => i.organization_id === org);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("integrations.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("integrations.subtitle")}</p>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><KeyRound className="h-3.5 w-3.5" /> {t("integrations.apiKeys")}</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-3.5 w-3.5" /> {t("integrations.webhooks")}</TabsTrigger>
          <TabsTrigger value="connectors"><CircuitBoard className="h-3.5 w-3.5" /> {t("integrations.connectors")}</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <ApiKeys keys={keys} />
        </TabsContent>
        <TabsContent value="webhooks">
          <Webhooks webhooks={webhooks} />
        </TabsContent>
        <TabsContent value="connectors">
          <Connectors integrations={integrations} providers={INTEGRATION_PROVIDERS} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ API Keys ------------------------------ */
function ApiKeys({ keys }: { keys: ReturnType<typeof useStore>["db"]["apiKeys"] }) {
  const { t } = useI18n();
  const { createApiKey, revokeApiKey } = useStore();
  const { timezone, language } = usePreferences();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [scopes, setScopes] = useState<string[]>(["read:tickets"]);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (s: string) =>
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const generate = () => {
    const result = createApiKey(name, scopes, days);
    setGenerated(result.plaintext);
    setName("");
    setOpen(false);
  };

  const copy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable in some sandboxes */
    }
  };

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("integrations.apiKeysDesc")}</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {t("integrations.generateKey")}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 text-start font-medium">{t("integrations.keyName")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("integrations.keyPrefix")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("integrations.scopes")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("integrations.lastUsed")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("common.status")}</th>
              <th className="px-4 py-3 text-end font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{t("common.empty")}</td></tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0 hover:bg-accent/40">
                <td className="px-4 py-3 font-medium">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}…</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{k.last_used_at ? formatDate(k.last_used_at, timezone, language) : "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={k.status === "active" ? "success" : "secondary"}>
                    {k.status === "active" ? t("common.active") : t("integrations.revoked")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-end">
                  {k.status === "active" && (
                    <Button size="sm" variant="destructive" onClick={() => revokeApiKey(k.id)}>
                      {t("integrations.revoke")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("integrations.generateKey")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>{t("integrations.keyName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Integration" />
            </div>
            <div className="grid gap-2">
              <Label>{t("integrations.expiresIn")}</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 90, 180, 365].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} {t("integrations.days")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("integrations.scopes")}</Label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {API_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggleScope(s)} />
                    <span className="font-mono text-xs">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={!name.trim() || scopes.length === 0} onClick={generate}>
              {t("integrations.generateKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated key reveal */}
      <Dialog open={!!generated} onOpenChange={(o) => !o && (setGenerated(null), setCopied(false))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("integrations.generatedKey")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-3">
              <code className="break-all text-xs">{generated}</code>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("integrations.copyWarning")}</p>
          </div>
          <DialogFooter>
            <Button onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Webhooks ------------------------------ */
function Webhooks({ webhooks }: { webhooks: ReturnType<typeof useStore>["db"]["webhooks"] }) {
  const { t } = useI18n();
  const { createWebhook, toggleWebhook } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState(WEBHOOK_EVENTS[0]);
  const [secret, setSecret] = useState("");

  const submit = () => {
    createWebhook({ name, url, event, secret_hash: secret ? `sha256(${secret.slice(0, 6)}…)` : null, active: true });
    setName(""); setUrl(""); setSecret(""); setEvent(WEBHOOK_EVENTS[0]);
    setOpen(false);
  };

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("integrations.webhooksDesc")}</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {t("integrations.newWebhook")}
        </Button>
      </div>

      <div className="space-y-3">
        {webhooks.length === 0 && (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">{t("common.empty")}</div>
        )}
        {webhooks.map((w) => (
          <Card key={w.id} className="py-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Webhook className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{w.name}</span>
                  <Badge variant={w.active ? "success" : "secondary"}>
                    {w.active ? t("common.active") : t("common.inactive")}
                  </Badge>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">{w.url}</div>
                <div className="text-xs text-muted-foreground">{w.event}</div>
              </div>
              <Switch checked={w.active} onCheckedChange={() => toggleWebhook(w.id)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("integrations.newWebhook")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>{t("integrations.webhookName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t("integrations.endpointUrl")}</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="grid gap-2">
              <Label>{t("integrations.event")}</Label>
              <Select value={event} onValueChange={setEvent}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map((ev) => (
                    <SelectItem key={ev} value={ev}>{ev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("integrations.secret")}</Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={!name.trim() || !url.trim()} onClick={submit}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Connectors ------------------------------ */
function Connectors({
  integrations,
  providers,
}: {
  integrations: ReturnType<typeof useStore>["db"]["integrations"];
  providers: typeof INTEGRATION_PROVIDERS;
}) {
  const { t } = useI18n();
  const { setIntegrationStatus } = useStore();

  const lookup = useMemo(() => {
    const map = new Map<string, (typeof integrations)[number]>();
    integrations.forEach((i) => map.set(i.provider, i));
    return map;
  }, [integrations]);

  return (
    <div className="space-y-3 pt-4">
      <p className="text-sm text-muted-foreground">{t("integrations.connectorsDesc")}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const existing = lookup.get(p.id);
          const connected = existing?.status === "connected";
          return (
            <Card key={p.id} className="py-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.accent }}>
                    <CircuitBoard className="h-4 w-4" />
                  </div>
                  <Badge variant={connected ? "success" : "outline"}>
                    {connected ? t("integrations.connected") : t("integrations.disconnected")}
                  </Badge>
                </div>
                <h3 className="mt-3 font-medium">{p.label}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                {existing && Object.keys(existing.config).length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {Object.entries(existing.config).map(([k, v]) => (
                      <div key={k} className="truncate text-xs text-muted-foreground">
                        <span className="font-medium">{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant={connected ? "outline" : "default"}
                  className="mt-3"
                  onClick={() =>
                    existing && setIntegrationStatus(existing.id, connected ? "disconnected" : "connected")
                  }
                >
                  {connected ? t("integrations.disconnect") : t("integrations.connect")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}