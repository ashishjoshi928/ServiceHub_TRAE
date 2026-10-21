import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, Timer } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate, slaRemaining } from "@/lib/format";
import { StatusBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";

export function SlaMonitor({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const { t } = useI18n();
  const { db, currentProfile } = useStore();
  const { timezone, language } = usePreferences();

  const orgTickets = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    return db.tickets.filter((tk) => tk.organization_id === org);
  }, [db.tickets, currentProfile.organization_id]);

  // Only consider tickets still within an active SLA window.
  const tracked = useMemo(() => {
    const active = orgTickets.filter((tk) => tk.status === "new" || tk.status === "open" || tk.status === "pending");
    return active.map((tk) => ({ ticket: tk, sla: slaRemaining(tk.sla_due_at) }));
  }, [orgTickets]);

  const stats = useMemo(() => {
    const breached = tracked.filter((x) => x.sla.breached).length;
    const warning = tracked.filter((x) => !x.sla.breached && x.sla.ms < 4 * 3600_000).length;
    const met = tracked.filter((x) => !x.sla.breached && x.sla.ms >= 4 * 3600_000).length;
    const total = tracked.length;
    const compliance = total === 0 ? 100 : Math.round(((total - breached) / total) * 100);
    return { breached, warning, met, total, compliance };
  }, [tracked]);

  const pieData = [
    { name: t("tickets.slaBreached"), value: stats.breached, color: "#ef4444" },
    { name: t("tickets.slaWarning"), value: stats.warning, color: "#f59e0b" },
    { name: t("tickets.slaMet"), value: stats.met, color: "#10b981" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("nav.slaMonitor")}</h2>
        <p className="text-sm text-muted-foreground">{t("report.slaCompliance")}</p>
      </div>

      {/* Stats + donut */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 lg:col-span-1">
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={2}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 lg:col-span-3">
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={<Clock className="h-4 w-4" />} label={t("tickets.activeQueue")} value={String(stats.total)} tone="text-muted-foreground" />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t("tickets.slaMet")} value={String(stats.met)} tone="text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={<Timer className="h-4 w-4" />} label={t("tickets.slaWarning")} value={String(stats.warning)} tone="text-amber-600 dark:text-amber-400" />
            <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t("tickets.slaBreached")} value={String(stats.breached)} tone="text-red-600 dark:text-red-400" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("tickets.slaCompliance")}</span>
              <span className="text-2xl font-semibold">{stats.compliance}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", stats.compliance >= 90 ? "bg-emerald-500" : stats.compliance >= 70 ? "bg-amber-500" : "bg-red-500")}
                style={{ width: `${stats.compliance}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breach list */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 text-start font-medium">{t("tickets.ticketNumber")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("tickets.subject")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("common.status")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("tickets.slaDue")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("tickets.remaining")}</th>
            </tr>
          </thead>
          <tbody>
            {tracked.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{t("tickets.noTickets")}</td>
              </tr>
            )}
            {tracked
              .slice()
              .sort((a, b) => a.sla.ms - b.sla.ms)
              .map(({ ticket, sla }) => (
                <tr key={ticket.id} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium text-muted-foreground">{ticket.ticket_number}</td>
                  <td className="max-w-sm px-4 py-3">
                    <button onClick={() => onOpenTicket(ticket.id)} className="truncate text-start font-medium hover:text-primary">
                      {ticket.subject}
                    </button>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(ticket.sla_due_at, timezone, language)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", sla.breached ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : sla.ms < 4 * 3600_000 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300")}>
                      {sla.breached ? t("tickets.slaBreached") : sla.ms < 4 * 3600_000 ? t("tickets.slaWarning") : t("tickets.slaMet")}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className={cn("mt-1 text-2xl font-semibold", tone)}>{value}</div>
    </div>
  );
}