import type {
  AiProviderOption,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "./types";

export const TIMEZONES: { value: string; label: string; region: string }[] = [
  { value: "Asia/Dubai", label: "Dubai (GST)", region: "Gulf" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)", region: "Gulf" },
  { value: "Asia/Kolkata", label: "Kolkata (IST)", region: "Asia" },
  { value: "Europe/London", label: "London (GMT/BST)", region: "Europe" },
  { value: "America/New_York", label: "New York (EST/EDT)", region: "Americas" },
  { value: "UTC", label: "UTC", region: "Universal" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", region: "Oceania" },
];

export const LANGUAGES = [
  { value: "en", label: "English", dir: "ltr", flag: "🇬🇧" },
  { value: "ar", label: "العربية", dir: "rtl", flag: "🇦🇪" },
] as const;

export const PERSONAS: {
  role: UserRole;
  navLabel: string;
  description: string;
}[] = [
  { role: "super_admin", navLabel: "Super Admin", description: "Platform control plane" },
  { role: "admin", navLabel: "Admin", description: "Operational management console" },
  { role: "agent", navLabel: "Agent", description: "Triage & resolution workspace" },
  { role: "approver", navLabel: "Approver", description: "Approval inbox" },
  { role: "requester", navLabel: "Requester", description: "Employee service portal" },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  agent: "Agent",
  approver: "Approver",
  requester: "Requester",
};

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { color: string; dot: string }
> = {
  new: { color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", dot: "bg-sky-500" },
  open: { color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", dot: "bg-blue-500" },
  pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500" },
  resolved: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500" },
  closed: { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300", dot: "bg-zinc-500" },
};

export const PRIORITY_META: Record<TicketPriority, { color: string }> = {
  low: { color: "text-zinc-500" },
  medium: { color: "text-sky-600 dark:text-sky-300" },
  high: { color: "text-amber-600 dark:text-amber-300" },
  critical: { color: "text-red-600 dark:text-red-300" },
};

export const CATEGORIES: TicketCategory[] = [
  "hardware",
  "software",
  "network",
  "access",
  "hr",
  "facilities",
  "finance",
  "other",
];

export const ASSIGNMENT_GROUPS = [
  "IT Service Desk",
  "Network Operations",
  "Infrastructure & Cloud",
  "HR Operations",
  "Facilities Management",
  "Application Support",
  "Finance & Procurement",
  "Security Operations",
];

export const AI_PROVIDERS: AiProviderOption[] = [
  {
    id: "falcon",
    vendor: "Falcon LLM (UAE)",
    models: ["Falcon-180B", "Falcon-H2"],
    region: "UAE Sovereign",
    sovereign: true,
  },
  {
    id: "openai",
    vendor: "OpenAI ChatGPT",
    models: ["GPT-4o", "O3"],
    region: "Global (US)",
    sovereign: false,
  },
  {
    id: "gemini",
    vendor: "Google Gemini",
    models: ["Gemini 1.5 Pro", "Gemini 1.5 Flash"],
    region: "Global",
    sovereign: false,
  },
  {
    id: "claude",
    vendor: "Anthropic Claude",
    models: ["Claude 3.5 Sonnet"],
    region: "Global (US)",
    sovereign: false,
  },
  {
    id: "deepseek",
    vendor: "DeepSeek",
    models: ["DeepSeek V3", "DeepSeek R1"],
    region: "Global",
    sovereign: false,
  },
  {
    id: "qwen",
    vendor: "Alibaba Qwen",
    models: ["Qwen 2.5", "Qwen 3"],
    region: "Global",
    sovereign: false,
  },
];

export const INTEGRATION_PROVIDERS = [
  { id: "freshworks", label: "Freshworks", accent: "#22c55e", description: "Freshdesk / Freshservice sync" },
  { id: "servicenow", label: "ServiceNow", accent: "#10b981", description: "Incident & CMDB connector" },
  { id: "jira", label: "Jira", accent: "#2684ff", description: "Software issue orchestration" },
  { id: "slack", label: "Slack", accent: "#4a154b", description: "Channel notifications" },
  { id: "teams", label: "Microsoft Teams", accent: "#6264a7", description: "Adaptive cards & alerts" },
  { id: "webhook", label: "Webhook Proxy", accent: "#64748b", description: "Custom outbound REST" },
];

export const WEBHOOK_EVENTS = [
  "ticket.created",
  "ticket.updated",
  "ticket.status_changed",
  "ticket.sla_breach",
  "ticket.resolved",
  "approval.requested",
  "approval.decided",
];

export const API_SCOPES = ["read:tickets", "write:tickets", "read:catalog", "read:analytics", "write:webhooks"];

export const PREVIEW_SUPER_ADMIN_EMAIL = "ashishjoshi928@gmail.com";
export const PREVIEW_ORG_NAME = "Global Enterprise HQ";