import { useMemo, useState } from "react";
import { Clock, TicketCheck, UserPlus } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button, Input } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate, slaRemaining } from "@/lib/format";
import { PriorityBadge, StatusBadge, PersonaAvatar } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import type { TicketPriority, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["new", "open", "pending", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];

export function AgentQueue({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const { t } = useI18n();
  const { db, currentRole, currentProfile, updateTicket } = useStore();
  const { timezone, language } = usePreferences();
  const [status, setStatus] = useState<"all" | TicketStatus>("all");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    const set = new Set(
      db.tickets.filter((tk) => tk.organization_id === org).map((tk) => tk.group_id).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [db.tickets, currentProfile.organization_id]);

  const tickets = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    const q = search.trim().toLowerCase();
    return db.tickets
      .filter((tk) => tk.organization_id === org)
      .filter((tk) => (mine ? tk.assignee_id === currentProfile.id : true))
      .filter((tk) => (status === "all" ? true : tk.status === status))
      .filter((tk) => (priority === "all" ? true : tk.priority === priority))
      .filter(
        (tk) =>
          !q ||
          tk.subject.toLowerCase().includes(q) ||
          tk.ticket_number.toLowerCase().includes(q) ||
          (tk.description ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // active first, then by priority weight, then SLA urgency
        const active = (s: TicketStatus) => s === "new" || s === "open" || s === "pending";
        if (active(a.status) !== active(b.status)) return active(a.status) ? -1 : 1;
        return (a.sla_due_at ?? "").localeCompare(b.sla_due_at ?? "");
      });
  }, [db.tickets, currentProfile, mine, status, priority, search]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("nav.queue")}</h2>
        <p className="text-sm text-muted-foreground">{t("tickets.allTickets")}</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          className="h-9 max-w-xs"
        />
        <button
          onClick={() => setMine((v) => !v)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            mine ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
          )}
        >
          {t("tickets.myQueue")}
        </button>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} · {t("common.status")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} · {t("common.priority")}</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <TicketCheck className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("tickets.noTickets")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">{t("tickets.ticketNumber")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("tickets.subject")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("tickets.requester")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common.priority")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("tickets.slaDue")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("tickets.assignee")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((tk) => {
                const requester = db.profiles.find((p) => p.id === tk.requester_id);
                const assignee = db.profiles.find((p) => p.id === tk.assignee_id);
                const sla = slaRemaining(tk.sla_due_at);
                const isMine = tk.assignee_id === currentProfile.id;
                return (
                  <tr key={tk.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-muted-foreground">{tk.ticket_number}</td>
                    <td className="max-w-xs px-4 py-3">
                      <button onClick={() => onOpenTicket(tk.id)} className="truncate text-start font-medium hover:text-primary">
                        {tk.subject}
                      </button>
                      <div className="text-xs text-muted-foreground">{t(`category.${tk.category}`)} · {tk.group_id ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {requester && <PersonaAvatar profile={requester} size="sm" />}
                        <span className="truncate">{requester?.full_name ?? "—"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={tk.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={tk.status} /></td>
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1 text-xs font-semibold", sla.breached ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                        <Clock className="h-3.5 w-3.5" />
                        {sla.label(() => "")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{assignee?.full_name ?? t("tickets.unassigned")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isMine && (
                          <Button size="sm" variant="outline" onClick={() => updateTicket(tk.id, { assignee_id: currentProfile.id })}>
                            <UserPlus className="h-3.5 w-3.5" /> {t("common.assignToMe")}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onOpenTicket(tk.id)}>
                          {t("common.view")}
                        </Button>
                      </div>
                    </td>
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