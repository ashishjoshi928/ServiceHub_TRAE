// TypeScript types mirroring the Supabase/PostgreSQL schema 1:1.

export type UserRole = "super_admin" | "admin" | "agent" | "approver" | "requester";

export type TicketStatus = "new" | "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "access"
  | "hr"
  | "facilities"
  | "finance"
  | "other";

export type SubscriptionTier = "free" | "starter" | "growth" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type RuleEvent = "on_create" | "on_update" | "on_sla_breach";
export type UiRuleType = "mandatory" | "hidden" | "readonly";

export type ThemeMode = "system" | "light" | "dark";
export type Language = "en" | "ar";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: SubscriptionTier;
  status: "active" | "suspended" | string;
  country?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  job_title?: string | null;
  timezone: string;
  language: Language;
  theme: ThemeMode;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  organization_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester_id: string | null;
  assignee_id: string | null;
  group_id: string | null;
  source: string;
  sla_due_at: string | null;
  resolved_at: string | null;
  ai_summary: string | null;
  classification: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  category: TicketCategory;
  icon: string | null;
  price: number;
  sla_hours: number;
  requires_approval: boolean;
  form_schema_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormFieldDefinition {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "date" | "email" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormSchema {
  id: string;
  organization_id: string;
  name: string;
  schema: FormFieldDefinition[];
  source_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticle {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  author_id: string | null;
  published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  organization_id: string;
  ticket_id: string;
  approver_id: string | null;
  requested_by: string | null;
  status: ApprovalStatus;
  comment: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface BusinessRuleCondition {
  field: "category" | "priority" | "subject" | "source";
  operator: "equals" | "not_equals" | "contains";
  value: string;
}

export interface BusinessRuleAction {
  type: "assign_group" | "set_priority" | "notify" | "route";
  value: string;
}

export interface BusinessRule {
  id: string;
  organization_id: string;
  name: string;
  event: RuleEvent;
  conditions: BusinessRuleCondition[];
  actions: BusinessRuleAction[];
  active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface UiPolicy {
  id: string;
  organization_id: string;
  name: string;
  table_name: string;
  field_name: string;
  rule_type: UiRuleType;
  applies_to_role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  organization_id: string;
  provider: string;
  name: string;
  config: Record<string, string>;
  status: "connected" | "disconnected";
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  event: string;
  secret_hash: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  plan_name: string | null;
  seats: number;
  monthly_price: number;
  currency: string;
  contract_start_date: string | null;
  contract_renewal_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AiProviderId =
  | "falcon"
  | "openai"
  | "gemini"
  | "claude"
  | "deepseek"
  | "qwen";

export interface AiProviderOption {
  id: AiProviderId;
  vendor: string;
  models: string[];
  region: string;
  sovereign: boolean;
}