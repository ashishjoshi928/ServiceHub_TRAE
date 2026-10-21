import { useMemo } from "react";
import { Badge } from "@/components/ui";
import { Avatar, AvatarFallback } from "@/components/ui/radix";
import { useI18n } from "@/i18n/I18nProvider";
import {
  PRIORITY_META,
  ROLE_LABEL,
  TICKET_STATUS_META,
} from "@/lib/constants";
import { initials } from "@/lib/utils";
import type {
  ApprovalStatus,
  Profile,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@/lib/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useI18n();
  const meta = TICKET_STATUS_META[status];
  return (
    <Badge variant="outline" className={meta.color}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${meta.dot} rtl:ml-1.5 rtl:mr-0`} />
      {t(`status.${status}`)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useI18n();
  const meta = PRIORITY_META[priority];
  return <span className={`text-xs font-semibold ${meta.color}`}>{t(`priority.${priority}`)}</span>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useI18n();
  const tone: Record<UserRole, string> = {
    super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    admin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    agent: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    approver: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    requester: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
  };
  return <Badge variant="outline" className={tone[role]}>{ROLE_LABEL[role]}</Badge>;
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const { t } = useI18n();
  const tone: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return <Badge variant="outline" className={tone[status]}>{t(`approvals.${status}`)}</Badge>;
}

export function PersonaAvatar({ profile, size = "md" }: { profile: Profile; size?: "sm" | "md" | "lg" }) {
  const sizeCls = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-base" }[size];
  const color = useMemo(() => {
    const palette = ["bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
    let hash = 0;
    for (let i = 0; i < profile.full_name.length; i++) hash = (hash * 31 + profile.full_name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }, [profile.full_name]);
  return (
    <Avatar className={sizeCls}>
      <AvatarFallback className={`${color} text-white`}>{initials(profile.full_name)}</AvatarFallback>
    </Avatar>
  );
}