import { useMemo, useState } from "react";
import { Plus, Trash2, Workflow } from "lucide-react";
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
} from "@/components/ui/radix";
import { useStore } from "@/lib/store";
import { ASSIGNMENT_GROUPS, CATEGORIES } from "@/lib/constants";
import type {
  BusinessRule,
  BusinessRuleAction,
  BusinessRuleCondition,
  RuleEvent,
} from "@/lib/types";

const EVENTS: RuleEvent[] = ["on_create", "on_update", "on_sla_breach"];
const CONDITION_FIELDS = ["category", "priority", "subject", "source"] as const;
const OPERATORS = ["equals", "not_equals", "contains"] as const;
const ACTION_TYPES = ["assign_group", "set_priority", "notify", "route"] as const;

function emptyRule(): BusinessRule {
  return {
    id: "",
    organization_id: "",
    name: "",
    event: "on_create",
    conditions: [],
    actions: [],
    active: true,
    order_index: 0,
    created_at: "",
    updated_at: "",
  };
}

function eventLabel(t: (k: string) => string, event: RuleEvent): string {
  return event === "on_create"
    ? t("admin.eventOnCreate")
    : event === "on_update"
      ? t("admin.eventOnUpdate")
      : t("admin.eventOnSlaBreach");
}

function actionLabel(t: (k: string) => string, type: BusinessRuleAction["type"]): string {
  const map: Record<string, string> = {
    assign_group: t("admin.actionAssignGroup"),
    set_priority: t("admin.actionSetPriority"),
    notify: t("admin.actionNotify"),
    route: t("admin.actionRoute"),
  };
  return map[type] ?? type;
}

export function BusinessRules() {
  const { t } = useI18n();
  const { db, currentProfile, saveBusinessRule, deleteBusinessRule } = useStore();
  const [editing, setEditing] = useState<BusinessRule | null>(null);

  const org = currentProfile.organization_id ?? "org_global";
  const rules = useMemo(
    () =>
      db.businessRules
        .filter((r) => r.organization_id === org)
        .sort((a, b) => a.order_index - b.order_index),
    [db.businessRules, org],
  );

  const close = () => setEditing(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.businessRules")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.businessRulesDesc")}</p>
        </div>
        <Button onClick={() => setEditing(emptyRule())}>
          <Plus className="h-4 w-4" /> {t("admin.newRule")}
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Workflow className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("admin.noRules")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="py-0">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        {rule.active ? t("common.active") : t("common.inactive")}
                      </Badge>
                      <Badge variant="outline">{eventLabel(t, rule.event)}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {(rule.conditions.length > 0 ? rule.conditions : []).map((c, i) => (
                        <div key={i} className="flex flex-wrap gap-1.5 text-xs">
                          <span className="font-medium">{c.field}</span>
                          <span>{c.operator}</span>
                          <span className="rounded bg-muted px-1.5">{c.value}</span>
                        </div>
                      ))}
                      {rule.conditions.length === 0 && (
                        <div className="text-xs">{t("admin.conditions")}: —</div>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {rule.actions.map((a, i) => (
                        <span key={i} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {actionLabel(t, a.type)} → {a.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(v) => saveBusinessRule({ ...rule, active: v })}
                    />
                    <Button size="sm" variant="outline" onClick={() => setEditing(rule)}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteBusinessRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <RuleEditor
          rule={editing}
          onClose={close}
          onSave={(rule) => {
            saveBusinessRule({ ...rule, organization_id: org });
            close();
          }}
        />
      )}
    </div>
  );
}

function RuleEditor({
  rule,
  onClose,
  onSave,
}: {
  rule: BusinessRule;
  onClose: () => void;
  onSave: (rule: BusinessRule) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<BusinessRule>(() => ({ ...rule, conditions: [...rule.conditions], actions: [...rule.actions] }));

  const setCondition = (i: number, patch: Partial<BusinessRuleCondition>) => {
    setDraft((d) => {
      const conditions = d.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
      return { ...d, conditions };
    });
  };
  const setAction = (i: number, patch: Partial<BusinessRuleAction>) => {
    setDraft((d) => {
      const actions = d.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
      return { ...d, actions };
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? t("common.edit") : t("admin.newRule")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-2">
            <Label>{t("admin.ruleName")}</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>

          <div className="grid gap-2">
            <Label>{t("admin.event")}</Label>
            <Select value={draft.event} onValueChange={(v) => setDraft({ ...draft, event: v as RuleEvent })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENTS.map((e) => (
                  <SelectItem key={e} value={e}>{eventLabel(t, e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("common.active")}</Label>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin.conditions")}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({ ...draft, conditions: [...draft.conditions, { field: "category", operator: "equals", value: "" }] })
                }
              >
                <Plus className="h-3.5 w-3.5" /> {t("admin.addCondition")}
              </Button>
            </div>
            {draft.conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={c.field} onValueChange={(v) => setCondition(i, { field: v as BusinessRuleCondition["field"] })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={c.operator} onValueChange={(v) => setCondition(i, { operator: v as BusinessRuleCondition["operator"] })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ConditionValue condition={c} onChange={(v) => setCondition(i, { value: v })} />
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((_, idx) => idx !== i) })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin.actions")}</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({ ...draft, actions: [...draft.actions, { type: "assign_group", value: "" }] })
                }
              >
                <Plus className="h-3.5 w-3.5" /> {t("admin.addAction")}
              </Button>
            </div>
            {draft.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={a.type} onValueChange={(v) => setAction(i, { type: v as BusinessRuleAction["type"] })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((at) => (
                      <SelectItem key={at} value={at}>{actionLabel(t, at)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  list="groups"
                  value={a.value}
                  onChange={(e) => setAction(i, { value: e.target.value })}
                  className="flex-1"
                />
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, idx) => idx !== i) })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <datalist id="groups">
              {ASSIGNMENT_GROUPS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConditionValue({
  condition,
  onChange,
}: {
  condition: BusinessRuleCondition;
  onChange: (value: string) => void;
}) {
  if (condition.field === "category") {
    return (
      <Select value={condition.value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (condition.field === "priority") {
    return (
      <Select value={condition.value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["low", "medium", "high", "critical"].map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return <Input className="flex-1" value={condition.value} onChange={(e) => onChange(e.target.value)} />;
}