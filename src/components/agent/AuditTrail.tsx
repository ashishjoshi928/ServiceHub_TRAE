import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate } from "@/lib/format";
import { PersonaAvatar } from "@/components/common/badges";

export function AuditTrail() {
  const { t } = useI18n();
  const { db, currentRole, currentProfile } = useStore();
  const { timezone, language } = usePreferences();

  const logs = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    const scoped = db.auditLogs.filter((l) =>
      currentRole === "super_admin" ? true : l.organization_id === org,
    );
    return scoped.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [db.auditLogs, currentRole, currentProfile.organization_id]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("audit.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ShieldCheck className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("audit.noEvents")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">{t("audit.actor")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("audit.action")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("audit.entity")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("audit.details")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("audit.timestamp")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actor = db.profiles.find((p) => p.id === log.actor_id);
                return (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {actor && <PersonaAvatar profile={actor} size="sm" />}
                        <span className="font-medium">{actor?.full_name ?? "—"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono">{actionLabel(log.action, t)}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground">{log.entity_type}</td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground">
                      <span className="truncate">{log.entity_id ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(log.created_at, timezone, language)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function actionLabel(action: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    "ticket.created": t("tickets.newTicket"),
    "ticket.assigned": t("tickets.assign"),
    "ticket.status_changed": t("tickets.changeStatus"),
    "ticket.priority_changed": t("tickets.changePriority"),
    "ticket.resolved": t("status.resolved"),
    "ticket.noted": t("tickets.internalNote"),
    "ticket.replied": t("tickets.publicReply"),
    "approval.requested": t("approvals.pending"),
    "approval.approved": t("approvals.approved"),
    "approval.rejected": t("approvals.rejected"),
    "api_key.created": t("integrations.generateKey"),
    "api_key.revoked": t("integrations.revoke"),
    "integration.connected": t("integrations.connect"),
    "integration.disconnected": t("integrations.disconnect"),
    "business_rule.saved": t("nav.businessRules"),
    "business_rule.updated": t("nav.businessRules"),
    "ui_policy.saved": t("nav.uiPolicies"),
    "form_schema.saved": t("nav.schemaStudio"),
    "catalog.published": t("catalog.title"),
    "webhook.created": t("integrations.newWebhook"),
    "webhook.toggled": t("integrations.newWebhook"),
    "tenant.suspended": t("superadmin.suspended"),
    "subscription.renewed": t("nav.subscriptions"),
  };
  return map[action] ?? action;
}