import { useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CatalogIcon } from "@/components/common/CatalogIcon";
import { DynamicForm } from "@/components/common/DynamicForm";
import type { CatalogItem, FormSchema } from "@/lib/types";

interface Props {
  onOpenTicket: (id: string) => void;
}

export function ServiceCatalog({ onOpenTicket }: Props) {
  const { t } = useI18n();
  const { db, currentProfile, createTicket, createApproval } = useStore();
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptResult, setPromptResult] = useState<CatalogItem | null>(null);
  const [requesting, setRequesting] = useState<CatalogItem | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const items = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    const q = query.toLowerCase();
    return db.catalog.filter(
      (c) => c.organization_id === org && c.active && (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    );
  }, [db.catalog, query, currentProfile.organization_id]);

  const matchCatalog = (text: string): CatalogItem | null => {
    const keys: Record<string, string[]> = {
      hardware: ["laptop", "computer", "device", "macbook", "dell", "hardware", "monitor", "phone"],
      software: ["software", "install", "license", "app", "adobe", "office"],
      network: ["vpn", "wifi", "network", "internet", "connect"],
      access: ["password", "access", "card", "account", "reset", "permission"],
      hr: ["onboard", "employee", "new hire", "joiner", "hr", "staff"],
      facilities: ["facility", "printer", "room", "av", "ac", "light", "toner"],
      finance: ["expense", "reimburs", "invoice", "finance", "budget"],
    };
    const org = currentProfile.organization_id ?? "org_global";
    const pool = db.catalog.filter((c) => c.organization_id === org && c.active);
    const lower = text.toLowerCase();
    let best: CatalogItem | null = null;
    let bestScore = 0;
    for (const item of pool) {
      let score = 0;
      for (const [cat, words] of Object.entries(keys)) {
        for (const w of words) {
          if (lower.includes(w)) {
            score += item.category === cat ? 3 : item.name.toLowerCase().includes(w.slice(0, 4)) ? 2 : 1;
          }
        }
      }
      if (lower.includes(item.name.toLowerCase())) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return bestScore > 0 ? best : null;
  };

  const submitPrompt = () => {
    const match = matchCatalog(prompt);
    setPromptResult(match);
  };

  return (
    <div className="space-y-6">
      {/* Prompt-to-catalog hero */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> {t("catalog.generateForm")}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("catalog.promptHint")}
            className="h-10 flex-1"
            onKeyDown={(e) => e.key === "Enter" && submitPrompt()}
          />
          <Button onClick={submitPrompt} className="h-10">
            <Sparkles className="h-4 w-4" /> {t("catalog.generateForm")}
          </Button>
        </div>
        {promptResult && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border bg-background p-3">
            <Check className="h-4 w-4 text-emerald-500" />
            <div className="flex-1 text-sm">
              {t("catalog.generatedForYou")}: <span className="font-medium">{promptResult.name}</span>
            </div>
            <Button size="sm" onClick={() => setRequesting(promptResult)}>
              {t("catalog.requestNow")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("catalog.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("catalog.subtitle")}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("catalog.searchCatalog")} className="pl-9 rtl:pl-3 rtl:pr-9" />
        </div>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {t("common.submittedSuccessfully")} — {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <CatalogCard
            key={item.id}
            item={item}
            onRequest={() => setRequesting(item)}
          />
        ))}
      </div>
      {items.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("catalog.noCatalog")}</p>}

      {requesting && (
        <RequestDialog
          item={requesting}
          schema={db.formSchemas.find((f) => f.id === requesting.form_schema_id) ?? null}
          onClose={() => setRequesting(null)}
          onSubmit={(description) => {
            const ticket = createTicket({
              subject: requesting.name,
              description,
              category: requesting.category,
              priority: "medium",
              source: "ai",
              ai_summary: `Auto-generated request for ${requesting.name}`,
            });
            if (requesting.requires_approval) createApproval(ticket.id, currentProfile.id);
            setSuccess(ticket.ticket_number);
            setRequesting(null);
            setPrompt("");
            setPromptResult(null);
            onOpenTicket(ticket.id);
          }}
        />
      )}
    </div>
  );
}

function CatalogCard({ item, onRequest }: { item: CatalogItem; onRequest: () => void }) {
  const { t } = useI18n();
  return (
    <div className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CatalogIcon name={item.icon} className="h-5 w-5" />
        </div>
        {item.requires_approval && (
          <Badge variant="warning">{t("catalog.requiresApproval")}</Badge>
        )}
      </div>
      <h3 className="font-medium">{item.name}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t(`category.${item.category}`)} · {t("catalog.sla")} {item.sla_hours} {t("catalog.hours")}
        </span>
        <Button size="sm" variant="outline" onClick={onRequest}>
          {t("catalog.request")}
        </Button>
      </div>
    </div>
  );
}

function RequestDialog({
  item,
  schema,
  onClose,
  onSubmit,
}: {
  item: CatalogItem;
  schema: FormSchema | null;
  onClose: () => void;
  onSubmit: (description: string) => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [freeText, setFreeText] = useState("");

  const dynamicDescription = () => {
    const parts = Object.entries(values)
      .filter(([k, v]) => v && !k.startsWith("_"))
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
    if (freeText.trim()) parts.unshift(freeText.trim());
    return parts.join("\n") || freeText || item.description;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        {schema ? (
          <DynamicForm fields={schema.schema} values={values} onChange={setValues} />
        ) : (
          <div className="space-y-2">
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t("tickets.description")}
              className="min-h-[110px]"
            />
          </div>
        )}
        {item.requires_approval && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{t("catalog.requiresApproval")}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={() => onSubmit(dynamicDescription())}>{t("common.submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}