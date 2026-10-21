import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedDatabase } from "./mockData";
import { isPreviewMode } from "./supabaseClient";
import { uid } from "./utils";
import type {
  AiProviderId,
  ApiKey,
  Approval,
  ApprovalStatus,
  AuditLog,
  BusinessRule,
  CatalogItem,
  FormFieldDefinition,
  FormSchema,
  Integration,
  Profile,
  Ticket,
  TicketComment,
  TicketPriority,
  TicketStatus,
  UiPolicy,
  UserRole,
  Webhook,
} from "./types";

interface Db {
  tickets: Ticket[];
  comments: TicketComment[];
  catalog: CatalogItem[];
  formSchemas: FormSchema[];
  articles: import("./types").KnowledgeArticle[];
  approvals: Approval[];
  businessRules: BusinessRule[];
  uiPolicies: UiPolicy[];
  integrations: Integration[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  subscriptions: import("./types").Subscription[];
  auditLogs: AuditLog[];
  organizations: import("./types").Organization[];
  profiles: import("./types").Profile[];
}

export interface AiConfig {
  providerId: AiProviderId;
  model: string;
  apiKey: string;
  connected: boolean;
}

interface PersonaProfile {
  role: UserRole;
  profile: Profile;
}

interface StoreValue {
  db: Db;
  currentProfile: Profile;
  currentRole: UserRole;
  personaMap: Record<UserRole, Profile>;
  setPersona: (role: UserRole) => void;
  // ticket actions
  createTicket: (input: Partial<Ticket> & { subject: string }) => Ticket;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  addComment: (ticketId: string, body: string, isInternal: boolean) => void;
  createApproval: (ticketId: string, requestedBy: string) => void;
  decideApproval: (approvalId: string, status: ApprovalStatus, comment: string) => void;
  // configuration actions
  saveBusinessRule: (rule: BusinessRule) => void;
  deleteBusinessRule: (id: string) => void;
  saveUiPolicy: (policy: UiPolicy) => void;
  deleteUiPolicy: (id: string) => void;
  saveFormSchema: (schema: FormSchema) => void;
  publishSchemaToCatalog: (schema: FormSchema, itemName: string) => void;
  createApiKey: (name: string, scopes: string[], expiresInDays: number) => ApiKey & { plaintext: string };
  revokeApiKey: (id: string) => void;
  createWebhook: (input: Omit<Webhook, "id" | "organization_id" | "created_at" | "updated_at">) => void;
  toggleWebhook: (id: string) => void;
  setIntegrationStatus: (id: string, status: Integration["status"]) => void;
  addKnowledgeArticle: (article: import("./types").KnowledgeArticle) => void;
  aiConfig: AiConfig;
  setAiConfig: (cfg: AiConfig) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const DEFAULT_AI: AiConfig = {
  providerId: "falcon",
  model: "Falcon-180B",
  apiKey: "",
  connected: false,
};

// Representative profile for each persona within the preview org.
function buildPersonaMap(): Record<UserRole, Profile> {
  const pick = (id: string) => seedDatabase.profiles.find((p) => p.id === id)!;
  return {
    super_admin: pick("u_super"),
    admin: pick("u_admin"),
    agent: pick("u_agent1"),
    approver: pick("u_approver"),
    requester: pick("u_requester"),
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(() => {
    // In a real deployment this would hydrate from Supabase. Preview mode
    // hydrates from the secure in-memory seed bundle.
    return { ...seedDatabase } as Db;
  });
  const [personaMap] = useState<Record<UserRole, Profile>>(() => buildPersonaMap());
  const [currentProfile, setCurrentProfile] = useState<Profile>(() => personaMap.super_admin);
  const [aiConfig, setAiConfigState] = useState<AiConfig>(DEFAULT_AI);

  const currentRole = currentProfile.role;

  const setPersona = useCallback(
    (role: UserRole) => setCurrentProfile(personaMap[role]),
    [personaMap],
  );

  const writeAudit = (draft: Db, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) => {
    draft.auditLogs.unshift({
      id: uid("al"),
      organization_id: currentProfile.organization_id ?? "org_global",
      actor_id: currentProfile.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    });
  };

  const createTicket = useCallback(
    (input: Partial<Ticket> & { subject: string }): Ticket => {
      const org = currentProfile.organization_id ?? "org_global";
      const count = db.tickets.filter((t) => t.organization_id === org).length;
      const ticket: Ticket = {
        id: uid("tkt"),
        organization_id: org,
        ticket_number: `INC-${1001 + count}`,
        subject: input.subject,
        description: input.description ?? "",
        category: input.category ?? "other",
        priority: input.priority ?? "medium",
        status: "new",
        requester_id: input.requester_id ?? currentProfile.id,
        assignee_id: input.assignee_id ?? null,
        group_id: input.group_id ?? null,
        source: input.source ?? (input.description ? "ai" : "portal"),
        sla_due_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        resolved_at: null,
        ai_summary: input.ai_summary ?? null,
        classification: input.classification ?? null,
        sentiment: input.sentiment ?? null,
        sentiment_score: input.sentiment_score ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDb((prev) => {
        const draft = structuredClone(prev);
        draft.tickets.unshift(ticket);
        writeAudit(draft, "ticket.created", "ticket", ticket.ticket_number, { source: ticket.source });
        return draft;
      });
      return ticket;
    },
    [db.tickets, currentProfile],
  );

  const updateTicket = useCallback(
    (id: string, patch: Partial<Ticket>) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const idx = draft.tickets.findIndex((t) => t.id === id);
        if (idx === -1) return draft;
        const before = draft.tickets[idx];
        draft.tickets[idx] = { ...before, ...patch, updated_at: new Date().toISOString() };
        if (patch.status && patch.status !== before.status) {
          if (patch.status === "resolved") draft.tickets[idx].resolved_at = new Date().toISOString();
          writeAudit(draft, "ticket.status_changed", "ticket", before.ticket_number, { from: before.status, to: patch.status });
        }
        if (patch.assignee_id && patch.assignee_id !== before.assignee_id) {
          writeAudit(draft, "ticket.assigned", "ticket", before.ticket_number, { to: patch.assignee_id });
        }
        if (patch.priority && patch.priority !== before.priority) {
          writeAudit(draft, "ticket.priority_changed", "ticket", before.ticket_number, { from: before.priority, to: patch.priority });
        }
        return draft;
      });
    },
    [currentProfile],
  );

  const addComment = useCallback(
    (ticketId: string, body: string, isInternal: boolean) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        draft.comments.push({
          id: uid("c"),
          ticket_id: ticketId,
          author_id: currentProfile.id,
          body,
          is_internal: isInternal,
          created_at: new Date().toISOString(),
        });
        writeAudit(draft, isInternal ? "ticket.noted" : "ticket.replied", "ticket", ticketId, { internal: isInternal });
        return draft;
      });
    },
    [currentProfile],
  );

  const createApproval = useCallback(
    (ticketId: string, requestedBy: string) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const ticket = draft.tickets.find((t) => t.id === ticketId);
        const approver = draft.profiles.find(
          (p) => p.role === "approver" && p.organization_id === (ticket?.organization_id ?? currentProfile.organization_id),
        );
        const approval: Approval = {
          id: uid("ap"),
          organization_id: ticket?.organization_id ?? currentProfile.organization_id ?? "org_global",
          ticket_id: ticketId,
          approver_id: approver?.id ?? null,
          requested_by: requestedBy,
          status: "pending",
          comment: null,
          created_at: new Date().toISOString(),
          decided_at: null,
        };
        draft.approvals.unshift(approval);
        if (ticket) {
          ticket.status = "pending";
          ticket.updated_at = new Date().toISOString();
        }
        writeAudit(draft, "approval.requested", "approval", ticket?.ticket_number ?? ticketId);
        return draft;
      });
    },
    [currentProfile],
  );

  const decideApproval = useCallback(
    (approvalId: string, status: ApprovalStatus, comment: string) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const ap = draft.approvals.find((a) => a.id === approvalId);
        if (!ap) return draft;
        ap.status = status;
        ap.comment = comment;
        ap.decided_at = new Date().toISOString();
        const ticket = draft.tickets.find((t) => t.id === ap.ticket_id);
        const ticketNumber = ticket?.ticket_number ?? ap.ticket_id;
        writeAudit(draft, `approval.${status}`, "approval", ticketNumber, { comment });
        if (ticket && status === "approved" && ticket.status === "pending") {
          ticket.status = "open";
          ticket.updated_at = new Date().toISOString();
        }
        return draft;
      });
    },
    [currentProfile],
  );

  const saveBusinessRule = useCallback(
    (rule: BusinessRule) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const idx = draft.businessRules.findIndex((r) => r.id === rule.id);
        if (idx === -1) {
          draft.businessRules.push({ ...rule, id: rule.id || uid("br"), order_index: draft.businessRules.length + 1 });
        } else {
          draft.businessRules[idx] = { ...draft.businessRules[idx], ...rule };
        }
        writeAudit(draft, "business_rule.saved", "business_rule", rule.name);
        return draft;
      });
    },
    [currentProfile],
  );

  const deleteBusinessRule = useCallback((id: string) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      draft.businessRules = draft.businessRules.filter((r) => r.id !== id);
      return draft;
    });
  }, []);

  const saveUiPolicy = useCallback(
    (policy: UiPolicy) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const idx = draft.uiPolicies.findIndex((p) => p.id === policy.id);
        if (idx === -1) draft.uiPolicies.push({ ...policy, id: policy.id || uid("up") });
        else draft.uiPolicies[idx] = { ...draft.uiPolicies[idx], ...policy };
        writeAudit(draft, "ui_policy.saved", "ui_policy", policy.name);
        return draft;
      });
    },
    [currentProfile],
  );

  const deleteUiPolicy = useCallback((id: string) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      draft.uiPolicies = draft.uiPolicies.filter((p) => p.id !== id);
      return draft;
    });
  }, []);

  const saveFormSchema = useCallback(
    (schema: FormSchema) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const idx = draft.formSchemas.findIndex((s) => s.id === schema.id);
        if (idx === -1) draft.formSchemas.push({ ...schema, id: schema.id || uid("fs") });
        else draft.formSchemas[idx] = { ...draft.formSchemas[idx], ...schema };
        writeAudit(draft, "form_schema.saved", "form_schema", schema.name);
        return draft;
      });
    },
    [currentProfile],
  );

  const publishSchemaToCatalog = useCallback(
    (schema: FormSchema, itemName: string) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const item: CatalogItem = {
          id: uid("cat"),
          organization_id: currentProfile.organization_id ?? "org_global",
          name: itemName,
          description: schema.source_prompt ?? "Generated from prompt-to-form studio",
          category: "other",
          icon: "FileText",
          price: 0,
          sla_hours: 24,
          requires_approval: false,
          form_schema_id: schema.id,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        draft.catalog.unshift(item);
        writeAudit(draft, "catalog.published", "catalog_item", itemName);
        return draft;
      });
    },
    [currentProfile],
  );

  const createApiKey = useCallback(
    (name: string, scopes: string[], expiresInDays: number): ApiKey & { plaintext: string } => {
      const plaintext = `sh_live_${Array.from(crypto.getRandomValues(new Uint8Array(18)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;
      // Hash look-alike — in production the server hashes with SHA-256 and
      // only the hash is stored. Preview stores a redacted hash marker.
      const key: ApiKey = {
        id: uid("ak"),
        organization_id: currentProfile.organization_id ?? "org_global",
        name,
        key_hash: `sha256(${plaintext.slice(0, 8)}…)`,
        key_prefix: plaintext.slice(0, 16),
        scopes,
        status: "active",
        created_by: currentProfile.id,
        created_at: new Date().toISOString(),
        last_used_at: null,
        expires_at: new Date(Date.now() + expiresInDays * 86400_000).toISOString(),
        revoked_at: null,
      };
      setDb((prev) => {
        const draft = structuredClone(prev);
        draft.apiKeys.unshift(key);
        writeAudit(draft, "api_key.created", "api_key", key.key_prefix, { scopes });
        return draft;
      });
      return { ...key, plaintext };
    },
    [currentProfile],
  );

  const revokeApiKey = useCallback(
    (id: string) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const key = draft.apiKeys.find((k) => k.id === id);
        if (key) {
          key.status = "revoked";
          key.revoked_at = new Date().toISOString();
          writeAudit(draft, "api_key.revoked", "api_key", key.key_prefix);
        }
        return draft;
      });
    },
    [currentProfile],
  );

  const createWebhook = useCallback(
    (input: Omit<Webhook, "id" | "organization_id" | "created_at" | "updated_at">) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        draft.webhooks.push({
          ...input,
          id: uid("wh"),
          organization_id: currentProfile.organization_id ?? "org_global",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        writeAudit(draft, "webhook.created", "webhook", input.name, { event: input.event });
        return draft;
      });
    },
    [currentProfile],
  );

  const toggleWebhook = useCallback((id: string) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      const wh = draft.webhooks.find((w) => w.id === id);
      if (wh) {
        wh.active = !wh.active;
        writeAudit(draft, "webhook.toggled", "webhook", wh.name, { active: wh.active });
      }
      return draft;
    });
  }, [currentProfile]);

  const setIntegrationStatus = useCallback(
    (id: string, status: Integration["status"]) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        const it = draft.integrations.find((i) => i.id === id);
        if (it) {
          it.status = status;
          writeAudit(draft, `integration.${status}`, "integration", it.provider);
        }
        return draft;
      });
    },
    [currentProfile],
  );

  const addKnowledgeArticle = useCallback(
    (article: import("./types").KnowledgeArticle) => {
      setDb((prev) => {
        const draft = structuredClone(prev);
        draft.articles.unshift({ ...article, id: article.id || uid("kb") });
        return draft;
      });
    },
    [],
  );

  const setAiConfig = useCallback((cfg: AiConfig) => setAiConfigState(cfg), []);

  const value = useMemo<StoreValue>(
    () => ({
      db,
      currentProfile,
      currentRole,
      personaMap,
      setPersona,
      createTicket,
      updateTicket,
      addComment,
      createApproval,
      decideApproval,
      saveBusinessRule,
      deleteBusinessRule,
      saveUiPolicy,
      deleteUiPolicy,
      saveFormSchema,
      publishSchemaToCatalog,
      createApiKey,
      revokeApiKey,
      createWebhook,
      toggleWebhook,
      setIntegrationStatus,
      addKnowledgeArticle,
      aiConfig,
      setAiConfig,
    }),
    [
      db, currentProfile, currentRole, personaMap, setPersona, createTicket,
      updateTicket, addComment, createApproval, decideApproval, saveBusinessRule,
      deleteBusinessRule, saveUiPolicy, deleteUiPolicy, saveFormSchema,
      publishSchemaToCatalog, createApiKey, revokeApiKey, createWebhook,
      toggleWebhook, setIntegrationStatus, addKnowledgeArticle, aiConfig, setAiConfig,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within AppStoreProvider");
  return ctx;
}

export { isPreviewMode };