import { useMemo, useState } from "react";
import { Clock, ListChecks } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button, Card, CardContent } from "@/components/ui";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate, slaRemaining } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

const FILTERS: (TicketStatus | "all")[] = ["all", "new", "open", "pending", "resolved", "closed"];

export function MyRequests({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const { t } = useI18n();
  const { db, currentProfile } = useStore();
  const { timezone, language } = usePreferences();
  const [filter, setFilter] = useState<TicketStatus | "all">("all");

  const tickets = useMemo(() => {
    return db.tickets
      .filter((tk) => tk.requester_id === currentProfile.id)
      .filter((tk) => (filter === "all" ? true : tk.status === filter))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [db.tickets, currentProfile.id, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("nav.myRequests")}</h2>
        <p className="text-sm text-muted-foreground">{t("personas.requesterDesc")}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            {f === "all" ? t("common.all") : t(`status.${f}`)}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ListChecks className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("tickets.noTickets")}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((tk) => {
            const sla = slaRemaining(tk.sla_due_at);
            return (
              <Card key={tk.id} className="py-0">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{tk.ticket_number}</span>
                      <StatusBadge status={tk.status} />
                    </div>
                    <button
                      onClick={() => onOpenTicket(tk.id)}
                      className="mt-0.5 block truncate text-start text-sm font-medium hover:text-primary"
                    >
                      {tk.subject}
                    </button>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <PriorityBadge priority={tk.priority} />
                      <span>{t(`category.${tk.category}`)}</span>
                      <span>·</span>
                      <span>{formatDate(tk.created_at, timezone, language)}</span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        sla.breached ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {sla.label(() => "")}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => onOpenTicket(tk.id)}>
                      {t("common.view")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}