import { useEffect, useMemo, useState } from "react";
import { Clock, Lock, MessageSquare, Sparkles, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  Textarea,
} from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/radix";
import { useStore } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
import { ASSIGNMENT_GROUPS, PRIORITY_META, TICKET_STATUS_META } from "@/lib/constants";
import { formatDate, slaRemaining } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { PersonaAvatar } from "@/components/common/badges";
import type { TicketPriority, TicketStatus } from "@/lib/types";

interface Props {
  open: boolean;
  ticketId: string | null;
  onClose: () => void;
}

const STATUSES: TicketStatus[] = ["new", "open", "pending", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];

export function TicketDetail({ open, ticketId, onClose }: Props) {
  const { t } = useI18n();
  const { db, currentRole, currentProfile, updateTicket, addComment } = useStore();
  const { timezone, language } = usePreferences();
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");

  const ticket = useMemo(() => db.tickets.find((x) => x.id === ticketId), [db.tickets, ticketId]);

  const requester = ticket ? db.profiles.find((p) => p.id === ticket.requester_id) : null;
  const assignee = ticket ? db.profiles.find((p) => p.id === ticket.assignee_id) : null;
  const comments = useMemo(
    () =>
      db.comments
        .filter((c) => c.ticket_id === ticketId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [db.comments, ticketId],
  );

  useEffect(() => {
    setReply("");
    setNote("");
  }, [ticketId]);

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tickets.noTickets")}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const isStaff = currentRole === "agent" || currentRole === "admin" || currentRole === "super_admin";
  const visibleComments = isStaff ? comments : comments.filter((c) => !c.is_internal);
  const sla = slaRemaining(ticket.sla_due_at);
  const staffProfiles = db.profiles.filter((p) => p.role === "agent" || p.role === "admin");

  const sendReply = () => {
    if (!reply.trim()) return;
    addComment(ticket.id, reply.trim(), false);
    setReply("");
  };
  const sendNote = () => {
    if (!note.trim()) return;
    addComment(ticket.id, note.trim(), true);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <DialogTitle className="text-base sm:text-lg">{ticket.subject}</DialogTitle>
              <DialogDescription>
                {ticket.ticket_number} · {t("tickets.createdAt")}{" "}
                {formatDate(ticket.created_at, timezone, language)}
              </DialogDescription>
            </div>
            <StatusBadge status={ticket.status} />
          </div>
        </DialogHeader>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Meta label={t("common.priority")}>
            <PriorityBadge priority={ticket.priority} />
          </Meta>
          <Meta label={t("common.category")}>
            <span className="text-sm">{t(`category.${ticket.category}`)}</span>
          </Meta>
          <Meta label={t("tickets.slaDue")}>
            <span className={`flex items-center gap-1 text-sm font-medium ${sla.breached ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              <Clock className="h-3.5 w-3.5" />
              {sla.label(() => "")}
            </span>
          </Meta>
          <Meta label={t("tickets.requester")}>
            <span className="flex items-center gap-1.5 text-sm">
              {requester && <PersonaAvatar profile={requester} size="sm" />}
              {requester?.full_name ?? "—"}
            </span>
          </Meta>
          <Meta label={t("tickets.assignee")}>
            <span className="flex items-center gap-1.5 text-sm">
              {assignee && <PersonaAvatar profile={assignee} size="sm" />}
              {assignee?.full_name ?? t("tickets.unassigned")}
            </span>
          </Meta>
          <Meta label={t("tickets.group")}>
            <span className="text-sm">{ticket.group_id ?? "—"}</span>
          </Meta>
        </div>

        {ticket.description && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{ticket.description}</div>
        )}

        {isStaff && ticket.ai_summary && (
          <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <div className="mb-0.5 text-xs font-semibold text-primary">{t("tickets.aiSummary")}</div>
              <p className="text-foreground/90">{ticket.ai_summary}</p>
              {ticket.sentiment && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("tickets.sentiment")}: <span className="font-medium">{ticket.sentiment}</span>
                  {ticket.sentiment_score != null && <span> ({ticket.sentiment_score})</span>}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Staff controls */}
        {isStaff && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("common.status")}</div>
              <Select value={ticket.status} onValueChange={(v) => updateTicket(ticket.id, { status: v as TicketStatus })}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("common.priority")}</div>
              <Select value={ticket.priority} onValueChange={(v) => updateTicket(ticket.id, { priority: v as TicketPriority })}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t("tickets.assignee")}</div>
              <Select value={ticket.assignee_id ?? "none"} onValueChange={(v) => updateTicket(ticket.id, { assignee_id: v === "none" ? null : v })}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("tickets.unassigned")}</SelectItem>
                  {staffProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Separator />

        {/* Comments + reply */}
        <div>
          <div className="mb-2 text-sm font-semibold">{t("tickets.comments")}</div>
          {visibleComments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("tickets.noComments")}</p>
          ) : (
            <div className="space-y-3">
              {visibleComments.map((c) => {
                const author = db.profiles.find((p) => p.id === c.author_id);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    {author && <PersonaAvatar profile={author} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{author?.full_name ?? "—"}</span>
                        {c.is_internal && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                            <Lock className="h-3 w-3" /> {t("tickets.internalNote")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(c.created_at, timezone, language)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{c.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply box */}
        <Tabs defaultValue={isStaff ? "note" : "reply"}>
          <TabsList>
            {isStaff && <TabsTrigger value="note"><Lock className="h-3.5 w-3.5" /> {t("tickets.internalNote")}</TabsTrigger>}
            <TabsTrigger value="reply"><MessageSquare className="h-3.5 w-3.5" /> {t("tickets.publicReply")}</TabsTrigger>
          </TabsList>
          {isStaff && (
            <TabsContent value="note">
              <div className="space-y-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("tickets.addInternalNote")} />
                <Button size="sm" onClick={sendNote}>{t("common.send")}</Button>
              </div>
            </TabsContent>
          )}
          <TabsContent value="reply">
            <div className="space-y-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("tickets.addPublicReply")} />
              <Button size="sm" onClick={sendReply}>{t("common.send")}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}