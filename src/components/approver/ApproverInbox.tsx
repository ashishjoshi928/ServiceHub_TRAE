import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, MessageSquare, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Button, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { formatDate } from "@/lib/format";
import { ApprovalBadge } from "@/components/common/badges";
import type { Approval } from "@/lib/types";

export function ApproverInbox({ view, onOpenTicket }: { view: "inbox" | "allApprovals"; onOpenTicket: (id: string) => void }) {
  const { t } = useI18n();
  const { db, currentProfile, decideApproval } = useStore();
  const { timezone, language } = usePreferences();
  const [comment, setComment] = useState<Record<string, string>>({});

  const org = currentProfile.organization_id ?? "org_global";

  const all = useMemo(() => {
    return db.approvals
      .filter((a) => a.organization_id === org && a.approver_id === currentProfile.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [db.approvals, org, currentProfile.id]);

  const pending = all.filter((a) => a.status === "pending");
  const list = view === "inbox" ? pending : all;

  const decide = (approval: Approval, status: "approved" | "rejected") => {
    decideApproval(approval.id, status, comment[approval.id] ?? "");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {view === "inbox" ? t("approvals.title") : t("approvals.allApprovals")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {view === "inbox" ? t("approvals.subtitle") : `${t("common.total")}: ${all.length}`}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Inbox className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("approvals.noPending")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const ticket = db.tickets.find((tk) => tk.id === a.ticket_id);
            const requester = db.profiles.find((p) => p.id === a.requested_by);
            return (
              <div key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{ticket?.ticket_number ?? a.ticket_id}</span>
                      <ApprovalBadge status={a.status} />
                    </div>
                    <button
                      onClick={() => ticket && onOpenTicket(ticket.id)}
                      className="mt-1 block truncate text-start text-base font-medium hover:text-primary"
                    >
                      {ticket?.subject ?? t("approvals.ticket")}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t("approvals.requestedBy")}: {requester?.full_name ?? "—"}
                      </span>
                      <span>{formatDate(a.created_at, timezone, language)}</span>
                      {a.decided_at && (
                        <span>
                          {t("approvals.decided")} {formatDate(a.decided_at, timezone, language)}
                        </span>
                      )}
                    </div>
                    {a.comment && (
                      <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground/90">{a.comment}</p>
                    )}
                  </div>

                  {a.status === "pending" ? (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => decide(a, "rejected")}>
                        <XCircle className="h-4 w-4 text-red-500" /> {t("approvals.reject")}
                      </Button>
                      <Button size="sm" onClick={() => decide(a, "approved")}>
                        <CheckCircle2 className="h-4 w-4" /> {t("approvals.approve")}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => ticket && onOpenTicket(ticket.id)}>
                      {t("common.view")}
                    </Button>
                  )}
                </div>

                {a.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={comment[a.id] ?? ""}
                      onChange={(e) => setComment((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      placeholder={t("approvals.commentPlaceholder")}
                      className="min-h-[44px]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}