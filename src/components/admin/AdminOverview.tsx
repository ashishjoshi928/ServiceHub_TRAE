import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, LayoutDashboard, Ticket, Workflow } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate } from "@/lib/format";

export function AdminOverview() {
  const { t } = useI18n();
  const { db, currentProfile } = useStore();
  const { timezone, language } = usePreferences();

  const org = currentProfile.organization_id ?? "org_global";

  const stats = useMemo(() => {
    const tickets = db.tickets.filter((tk) => tk.organization_id === org);
    const open = tickets.filter((tk) => tk.status === "new" || tk.status === "open" || tk.status === "pending").length;
    const resolved = tickets.filter((tk) => tk.status === "resolved" || tk.status === "closed").length;
    const breached = tickets.filter((tk) => tk.sla_due_at && new Date(tk.sla_due_at).getTime() < Date.now() && (tk.status === "new" || tk.status === "open" || tk.status === "pending")).length;
    const rules = db.businessRules.filter((r) => r.organization_id === org);
    const policies = db.uiPolicies.filter((p) => p.organization_id === org);
    const pending = db.approvals.filter((a) => a.organization_id === org && a.status === "pending").length;
    return { total: tickets.length, open, resolved, breached, activeRules: rules.filter((r) => r.active).length, policies: policies.length, pending };
  }, [db, org]);

  const recent = useMemo(() => {
    return db.auditLogs
      .filter((l) => l.organization_id === org)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8);
  }, [db.auditLogs, org]);

  const cards = [
    { icon: Ticket, label: t("tickets.totalTickets"), value: String(stats.total), tone: "text-foreground" },
    { icon: Activity, label: t("tickets.openTickets"), value: String(stats.open), tone: "text-sky-600 dark:text-sky-300" },
    { icon: CheckCircle2, label: t("tickets.resolvedTickets"), value: String(stats.resolved), tone: "text-emerald-600 dark:text-emerald-300" },
    { icon: AlertTriangle, label: t("tickets.slaBreached"), value: String(stats.breached), tone: "text-red-600 dark:text-red-300" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("nav.overview")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{c.label}</span>
              </div>
              <div className={`mt-1 text-3xl font-semibold ${c.tone}`}>{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Config snapshot */}
        <div className="space-y-4 lg:col-span-1">
          <SnapshotCard
            icon={Workflow}
            title={t("admin.businessRules")}
            value={String(stats.activeRules)}
            sub={t("admin.activeRules")}
          />
          <SnapshotCard
            icon={LayoutDashboard}
            title={t("admin.uiPolicies")}
            value={String(stats.policies)}
            sub={t("admin.fieldBehaviors")}
          />
          <SnapshotCard
            icon={CheckCircle2}
            title={t("approvals.title")}
            value={String(stats.pending)}
            sub={t("approvals.pending")}
          />
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border bg-card lg:col-span-2">
          <div className="border-b px-5 py-3 text-sm font-semibold">{t("audit.title")}</div>
          <div className="divide-y">
            {recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("audit.noEvents")}</p>
            ) : (
              recent.map((log) => {
                const actor = db.profiles.find((p) => p.id === log.actor_id);
                return (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {log.action}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {log.entity_id ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {actor?.full_name ?? "—"} · {formatDate(log.created_at, timezone, language)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ icon: Icon, title, value, sub }: { icon: React.ElementType; title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}