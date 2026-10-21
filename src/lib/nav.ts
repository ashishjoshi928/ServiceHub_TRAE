import {
  Bot,
  Boxes,
  Building2,
  CircuitBoard,
  CreditCard,
  FileText,
  Gauge,
  GitBranch,
  Globe2,
  Inbox,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareText,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TicketCheck,
  Timer,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
}

export const NAV_CONFIG: Record<UserRole, NavItem[]> = {
  requester: [
    { id: "myRequests", labelKey: "nav.myRequests", icon: ListChecks },
    { id: "catalog", labelKey: "nav.catalog", icon: Boxes },
    { id: "knowledge", labelKey: "nav.knowledge", icon: Library },
  ],
  agent: [
    { id: "queue", labelKey: "nav.queue", icon: TicketCheck },
    { id: "slaMonitor", labelKey: "nav.slaMonitor", icon: Timer },
    { id: "auditTrail", labelKey: "nav.auditTrail", icon: ShieldCheck },
  ],
  approver: [
    { id: "inbox", labelKey: "nav.inbox", icon: Inbox },
    { id: "allApprovals", labelKey: "approvals.allApprovals", icon: ListChecks },
  ],
  admin: [
    { id: "overview", labelKey: "nav.overview", icon: LayoutDashboard },
    { id: "businessRules", labelKey: "nav.businessRules", icon: Workflow },
    { id: "uiPolicies", labelKey: "nav.uiPolicies", icon: SlidersHorizontal },
    { id: "schemaStudio", labelKey: "nav.schemaStudio", icon: Sparkles },
    { id: "integrations", labelKey: "nav.integrations", icon: CircuitBoard },
    { id: "aiModels", labelKey: "nav.aiModels", icon: Bot },
    { id: "reporting", labelKey: "nav.reporting", icon: Gauge },
  ],
  super_admin: [
    { id: "tenants", labelKey: "nav.tenants", icon: Building2 },
    { id: "subscriptions", labelKey: "nav.subscriptions", icon: CreditCard },
    { id: "financials", labelKey: "nav.financials", icon: Receipt },
  ],
};

export const ROLE_ICON: Record<UserRole, LucideIcon> = {
  super_admin: Globe2,
  admin: SlidersHorizontal,
  agent: TicketCheck,
  approver: Inbox,
  requester: FileText,
};

export const FEATURE_ICONS = {
  git: GitBranch,
  message: MessageSquareText,
  circuit: CircuitBoard,
};