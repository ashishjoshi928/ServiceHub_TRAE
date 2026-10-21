import { useMemo, useState } from "react";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
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
import type { UiPolicy, UiRuleType, UserRole } from "@/lib/types";

const RULE_TYPES: UiRuleType[] = ["mandatory", "hidden", "readonly"];
const ROLES: UserRole[] = ["super_admin", "admin", "agent", "approver", "requester"];
const TABLES = ["tickets", "catalog_items", "profiles", "approvals"];

function emptyPolicy(): UiPolicy {
  return {
    id: "",
    organization_id: "",
    name: "",
    table_name: "tickets",
    field_name: "",
    rule_type: "mandatory",
    applies_to_role: "requester",
    active: true,
    created_at: "",
    updated_at: "",
  };
}

function ruleLabel(t: (k: string) => string, type: UiRuleType): string {
  return type === "mandatory"
    ? t("admin.ruleMandatory")
    : type === "hidden"
      ? t("admin.ruleHidden")
      : t("admin.ruleReadonly");
}

export function UiPolicies() {
  const { t } = useI18n();
  const { db, currentProfile, saveUiPolicy, deleteUiPolicy } = useStore();
  const [editing, setEditing] = useState<UiPolicy | null>(null);

  const org = currentProfile.organization_id ?? "org_global";
  const policies = useMemo(
    () => db.uiPolicies.filter((p) => p.organization_id === org),
    [db.uiPolicies, org],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.uiPolicies")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.uiPoliciesDesc")}</p>
        </div>
        <Button onClick={() => setEditing(emptyPolicy())}>
          <Plus className="h-4 w-4" /> {t("admin.newPolicy")}
        </Button>
      </div>

      {policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <SlidersHorizontal className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">{t("admin.policyName")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("admin.table")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("admin.fieldName")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("admin.ruleType")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("admin.appliesTo")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.table_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.field_name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{ruleLabel(t, p.rule_type)}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{t(`roles.${p.applies_to_role}`)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? "success" : "secondary"}>
                      {p.active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>{t("common.edit")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteUiPolicy(p.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PolicyEditor
          policy={editing}
          onClose={() => setEditing(null)}
          onSave={(policy) => {
            saveUiPolicy({ ...policy, organization_id: org });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PolicyEditor({
  policy,
  onClose,
  onSave,
}: {
  policy: UiPolicy;
  onClose: () => void;
  onSave: (policy: UiPolicy) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<UiPolicy>({ ...policy });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? t("common.edit") : t("admin.newPolicy")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>{t("admin.policyName")}</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t("admin.table")}</Label>
              <Select value={draft.table_name} onValueChange={(v) => setDraft({ ...draft, table_name: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TABLES.map((tb) => <SelectItem key={tb} value={tb}>{tb}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.fieldName")}</Label>
              <Input value={draft.field_name} onChange={(e) => setDraft({ ...draft, field_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t("admin.ruleType")}</Label>
              <Select value={draft.rule_type} onValueChange={(v) => setDraft({ ...draft, rule_type: v as UiRuleType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((rt) => <SelectItem key={rt} value={rt}>{ruleLabel(t, rt)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.appliesTo")}</Label>
              <Select value={draft.applies_to_role} onValueChange={(v) => setDraft({ ...draft, applies_to_role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("common.active")}</Label>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!draft.name.trim() || !draft.field_name.trim()} onClick={() => onSave(draft)}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}