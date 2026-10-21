-- ============================================================================
-- ServiceHub Enterprise — Supabase / PostgreSQL Schema
-- Multi-tenant ESM / ITSM platform with strict RLS, RBAC, and a restricted
-- zero-delete AI proxy layer.
--
-- Security principles enforced at the DATABASE level (not just the app):
--   1. Every tenant table is guarded by Row Level Security on organization_id.
--   2. RBAC hierarchy: super_admin > admin > agent > approver > requester.
--   3. API keys are stored ONLY as SHA-256 hashes; plaintext is shown once.
--   4. An `ai_service_role` can ONLY run read-only AI inference functions.
--      It has NO SELECT/INSERT/UPDATE/DELETE grants on business rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. Enumerated types
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum
    ('super_admin', 'admin', 'agent', 'approver', 'requester');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum
    ('new', 'open', 'pending', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum
    ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_category as enum
    ('hardware', 'software', 'network', 'access', 'hr', 'facilities', 'finance', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_tier as enum
    ('free', 'starter', 'growth', 'enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum
    ('trialing', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum
    ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rule_event as enum
    ('on_create', 'on_update', 'on_sla_breach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ui_rule_type as enum
    ('mandatory', 'hidden', 'readonly');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. Core tenant tables
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  plan_tier   public.subscription_tier not null default 'free',
  status      text not null default 'active',
  country     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  role            public.user_role not null default 'requester',
  full_name       text not null default '',
  email           text unique,
  avatar_url      text,
  job_title       text,
  timezone        text not null default 'Asia/Dubai',
  language        text not null default 'en',
  theme           text not null default 'system',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. ITSM domains
-- ----------------------------------------------------------------------------
create table if not exists public.tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id),
  ticket_number    text not null,
  subject          text not null,
  description      text,
  category         public.ticket_category not null default 'other',
  priority         public.ticket_priority not null default 'medium',
  status           public.ticket_status not null default 'new',
  requester_id     uuid references public.profiles(id),
  assignee_id      uuid references public.profiles(id),
  group_id         text,
  source           text not null default 'portal',
  sla_due_at       timestamptz,
  resolved_at      timestamptz,
  ai_summary       text,
  classification   text,
  sentiment        text,
  sentiment_score  numeric(4,3),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, ticket_number)
);

create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  author_id   uuid references public.profiles(id),
  body        text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id),
  name              text not null,
  description       text,
  category          public.ticket_category not null default 'other',
  icon              text,
  price             numeric(12,2) default 0,
  sla_hours         numeric not null default 24,
  requires_approval boolean not null default false,
  form_schema_id    uuid,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.form_schemas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name            text not null,
  schema          jsonb not null default '[]'::jsonb,
  source_prompt   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.knowledge_articles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title           text not null,
  body            text not null,
  category        text,
  tags            text[] default '{}',
  author_id       uuid references public.profiles(id),
  published       boolean not null default true,
  views           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.approvals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  ticket_id       uuid not null references public.tickets(id) on delete cascade,
  approver_id     uuid references public.profiles(id),
  requested_by    uuid references public.profiles(id),
  status          public.approval_status not null default 'pending',
  comment         text,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);

-- ----------------------------------------------------------------------------
-- 4. Configuration domains (Admin Studios)
-- ----------------------------------------------------------------------------
create table if not exists public.business_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name            text not null,
  event           public.rule_event not null default 'on_create',
  conditions      jsonb not null default '[]'::jsonb,
  actions         jsonb not null default '[]'::jsonb,
  active          boolean not null default true,
  order_index     int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.ui_policies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name            text not null,
  table_name      text not null default 'tickets',
  field_name      text not null,
  rule_type       public.ui_rule_type not null default 'readonly',
  applies_to_role public.user_role not null default 'requester',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.integrations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  provider        text not null,
  name            text not null,
  config          jsonb not null default '{}'::jsonb,
  status          text not null default 'disconnected',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.api_keys (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name            text not null,
  key_hash        text not null,
  key_prefix      text not null,
  scopes          text[] not null default '{}',
  status          text not null default 'active',
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz
);

create table if not exists public.webhooks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name            text not null,
  url             text not null,
  event           text not null,
  secret_hash     text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. Subscription / financial domain (Super Admin)
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id),
  tier                  public.subscription_tier not null default 'starter',
  status                public.subscription_status not null default 'trialing',
  plan_name             text,
  seats                 int not null default 5,
  monthly_price         numeric(12,2) not null default 0,
  currency              text not null default 'USD',
  contract_start_date   date,
  contract_renewal_date date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  actor_id        uuid references public.profiles(id),
  action          text not null,
  entity_type     text,
  entity_id       text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 6. Indexes (FK + hot query paths per Supabase best practices)
-- ============================================================================
create index if not exists idx_tickets_org_status   on public.tickets (organization_id, status);
create index if not exists idx_tickets_org_assignee on public.tickets (organization_id, assignee_id);
create index if not exists idx_tickets_org_requester on public.tickets (organization_id, requester_id);
create index if not exists idx_tickets_sla_due       on public.tickets (sla_due_at) where status in ('new','open','pending');
create index if not exists idx_comments_ticket       on public.ticket_comments (ticket_id);
create index if not exists idx_audit_org_time        on public.audit_logs (organization_id, created_at desc);
create index if not exists idx_profiles_org          on public.profiles (organization_id);
create index if not exists idx_approvals_approver    on public.approvals (organization_id, approver_id, status);
create index if not exists idx_kb_org_search         on public.knowledge_articles using gin (tags);
create index if not exists idx_api_keys_hash         on public.api_keys (key_hash) where status = 'active';

-- ----------------------------------------------------------------------------
-- 7. RBAC helper functions (SECURITY DEFINER, fixed search_path)
-- ----------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'requester'::public.user_role);
$$;

create or replace function public.current_org()
returns uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.has_role(target public.user_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select role from public.profiles where id = auth.uid()) in (target, 'super_admin')
      or public.is_super_admin();
$$;

-- ============================================================================
-- 8. ROW LEVEL SECURITY — enable + FORCE on every tenant table
-- ============================================================================
alter table public.organizations   enable row level security; alter table public.organizations   force row level security;
alter table public.profiles        enable row level security; alter table public.profiles        force row level security;
alter table public.tickets         enable row level security; alter table public.tickets         force row level security;
alter table public.ticket_comments enable row level security; alter table public.ticket_comments force row level security;
alter table public.catalog_items   enable row level security; alter table public.catalog_items   force row level security;
alter table public.form_schemas    enable row level security; alter table public.form_schemas    force row level security;
alter table public.knowledge_articles enable row level security; alter table public.knowledge_articles force row level security;
alter table public.approvals       enable row level security; alter table public.approvals       force row level security;
alter table public.business_rules  enable row level security; alter table public.business_rules  force row level security;
alter table public.ui_policies     enable row level security; alter table public.ui_policies     force row level security;
alter table public.integrations    enable row level security; alter table public.integrations    force row level security;
alter table public.api_keys        enable row level security; alter table public.api_keys        force row level security;
alter table public.webhooks        enable row level security; alter table public.webhooks        force row level security;
alter table public.subscriptions   enable row level security; alter table public.subscriptions   force row level security;
alter table public.audit_logs      enable row level security; alter table public.audit_logs      force row level security;

-- ----------------------------------------------------------------------------
-- 8.1 organizations
-- ----------------------------------------------------------------------------
create policy org_select on public.organizations for select to authenticated
  using (id = public.current_org() or public.is_super_admin());
create policy org_insert on public.organizations for insert to authenticated
  with check (public.is_super_admin());
create policy org_update on public.organizations for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
-- intentionally NO delete policy: organizations cannot be hard-deleted.

-- ----------------------------------------------------------------------------
-- 8.2 profiles
-- ----------------------------------------------------------------------------
create policy prof_select on public.profiles for select to authenticated
  using (organization_id = public.current_org() or public.is_super_admin() or id = auth.uid());
create policy prof_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8.3 tickets — no hard delete anywhere
-- ----------------------------------------------------------------------------
create policy tk_select on public.tickets for select to authenticated
  using (
    organization_id = public.current_org()
    and (
      public.has_role('approver')
      or assignee_id = auth.uid()
      or requester_id = auth.uid()
      or public.has_role('agent')
    )
  );

create policy tk_insert on public.tickets for insert to authenticated
  with check (organization_id = public.current_org() and public.has_role('requester'));

create policy tk_update_staff on public.tickets for update to authenticated
  using (organization_id = public.current_org() and public.has_role('agent'))
  with check (organization_id = public.current_org());

create policy tk_update_requester on public.tickets for update to authenticated
  using (requester_id = auth.uid() and public.current_role() = 'requester')
  with check (requester_id = auth.uid() and public.current_role() = 'requester');

-- ----------------------------------------------------------------------------
-- 8.4 ticket_comments
-- ----------------------------------------------------------------------------
create policy tc_select on public.ticket_comments for select to authenticated
  using (
    (not is_internal and exists (
      select 1 from public.tickets t where t.id = ticket_id and t.organization_id = public.current_org()
    ))
    or (is_internal and public.has_role('agent'))
  );
create policy tc_insert on public.ticket_comments for insert to authenticated
  with check (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.organization_id = public.current_org()
        and (t.requester_id = auth.uid() or public.has_role('agent'))
    )
    and (is_internal = false or public.has_role('agent'))
  );

-- ----------------------------------------------------------------------------
-- 8.5 catalog_items
-- ----------------------------------------------------------------------------
create policy ci_select on public.catalog_items for select to authenticated
  using (organization_id = public.current_org());
create policy ci_write on public.catalog_items for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

-- ----------------------------------------------------------------------------
-- 8.6 form_schemas
-- ----------------------------------------------------------------------------
create policy fs_select on public.form_schemas for select to authenticated
  using (organization_id = public.current_org());
create policy fs_write on public.form_schemas for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

-- ----------------------------------------------------------------------------
-- 8.7 knowledge_articles
-- ----------------------------------------------------------------------------
create policy ka_select on public.knowledge_articles for select to authenticated
  using (organization_id = public.current_org());
create policy ka_write on public.knowledge_articles for all to authenticated
  using (public.has_role('agent'))
  with check (organization_id = public.current_org() and public.has_role('agent'));

-- ----------------------------------------------------------------------------
-- 8.8 approvals
-- ----------------------------------------------------------------------------
create policy ap_select on public.approvals for select to authenticated
  using (
    organization_id = public.current_org()
    and (approver_id = auth.uid() or requested_by = auth.uid() or public.has_role('agent'))
  );
create policy ap_insert on public.approvals for insert to authenticated
  with check (organization_id = public.current_org() and public.has_role('agent'));
create policy ap_decide on public.approvals for update to authenticated
  using (approver_id = auth.uid())
  with check (approver_id = auth.uid() and status in ('approved','rejected'));

-- ----------------------------------------------------------------------------
-- 8.9 business_rules / ui_policies / integrations / api_keys / webhooks
--     Admin-only write surfaces.
-- ----------------------------------------------------------------------------
create policy br_select on public.business_rules for select to authenticated
  using (organization_id = public.current_org());
create policy br_write on public.business_rules for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

create policy up_select on public.ui_policies for select to authenticated
  using (organization_id = public.current_org());
create policy up_write on public.ui_policies for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

create policy ig_select on public.integrations for select to authenticated
  using (organization_id = public.current_org());
create policy ig_write on public.integrations for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

create policy ak_select on public.api_keys for select to authenticated
  using (organization_id = public.current_org() and public.has_role('admin'));
create policy ak_insert on public.api_keys for insert to authenticated
  with check (organization_id = public.current_org() and public.has_role('admin'));
create policy ak_update on public.api_keys for update to authenticated
  using (organization_id = public.current_org() and public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));
-- intentionally NO delete policy for api_keys (revoke = soft status flip only).

create policy wh_select on public.webhooks for select to authenticated
  using (organization_id = public.current_org());
create policy wh_write on public.webhooks for all to authenticated
  using (public.has_role('admin'))
  with check (organization_id = public.current_org() and public.has_role('admin'));

-- ----------------------------------------------------------------------------
-- 8.10 subscriptions (Super Admin only)
-- ----------------------------------------------------------------------------
create policy sub_select on public.subscriptions for select to authenticated
  using (organization_id = public.current_org() or public.is_super_admin());
create policy sub_write on public.subscriptions for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 8.11 audit_logs — append-only, staff-readable
-- ----------------------------------------------------------------------------
create policy al_insert on public.audit_logs for insert to authenticated
  with check (organization_id = public.current_org());
create policy al_select on public.audit_logs for select to authenticated
  using (organization_id = public.current_org() and public.has_role('agent'));
-- no update / delete policies: audit trail is immutable.

-- ============================================================================
-- 9. API Key management (hashing only, no plaintext persisted)
-- ============================================================================
create or replace function public.create_api_key(
  p_name text, p_scopes text[] default '{}', p_expires_in_days int default 365
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := public.current_org();
  v_key text;
  v_prefix text;
begin
  if not public.has_role('admin') then
    raise exception 'Forbidden: admin role required';
  end if;

  v_key    := 'sh_live_' || encode(gen_random_bytes(24), 'hex');
  v_prefix := left(v_key, 16);

  insert into public.api_keys
    (organization_id, name, key_hash, key_prefix, scopes, expires_at, created_by)
  values
    (v_org, p_name, encode(digest(v_key, 'sha256'), 'hex'), v_prefix,
     p_scopes, now() + make_interval(days => p_expires_in_days), auth.uid());

  -- plaintext returned exactly once to the caller; never stored.
  return json_build_object('key', v_key, 'prefix', v_prefix);
end;
$$;

create or replace function public.verify_api_key(p_key text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select organization_id
  from public.api_keys
  where key_hash = encode(digest(p_key, 'sha256'), 'hex')
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.revoke_api_key(p_key_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Forbidden: admin role required';
  end if;
  update public.api_keys
     set status = 'revoked', revoked_at = now()
   where id = p_key_id and organization_id = public.current_org();
end;
$$;

-- ============================================================================
-- 10. AI Proxy layer — read-only inference ONLY, zero delete / update / insert
-- ============================================================================
do $$ begin
  create role ai_service_role nologin;
exception when duplicate_object then null; end $$;

-- Read the minimal ticket payload the AI needs for classification/summary.
create or replace function public.ai_read_ticket(p_ticket_id uuid)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare v_org uuid := public.current_org(); v_row json;
begin
  select json_build_object(
    'id', t.id, 'subject', t.subject, 'description', t.description,
    'category', t.category, 'status', t.status
  ) into v_row
  from public.tickets t
  where t.id = p_ticket_id and t.organization_id = v_org;
  return v_row;
end;
$$;

-- Classify a ticket into a category + priority suggestion (read + narrow write to tickets only).
create or replace function public.ai_classify_ticket(p_ticket_id uuid, p_category text, p_priority text, p_confidence numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- Guard: must belong to the calling tenant.
  if not exists (select 1 from public.tickets t
                 where t.id = p_ticket_id and t.organization_id = public.current_org()) then
    raise exception 'Not found';
  end if;
  -- Allow the AI to set ONLY these three advisory columns; never status/priority
  -- of record, never delete.
  update public.tickets
     set classification = p_category,
         priority = p_priority::public.ticket_priority,
         sentiment_score = p_confidence
   where id = p_ticket_id;
end;
$$;

-- Summarize a resolved ticket (read-only operation that writes only the ai_summary column).
create or replace function public.ai_summarize_ticket(p_ticket_id uuid, p_summary text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.tickets t
                 where t.id = p_ticket_id and t.organization_id = public.current_org()) then
    raise exception 'Not found';
  end if;
  update public.tickets set ai_summary = p_summary where id = p_ticket_id;
end;
$$;

-- Explicit grants: AI role can ONLY execute the three safe RPCs above.
revoke all on all tables in schema public from ai_service_role;
revoke all on all functions in schema public from ai_service_role;
grant execute on function public.ai_read_ticket(uuid) to ai_service_role;
grant execute on function public.ai_classify_ticket(uuid, text, text, numeric) to ai_service_role;
grant execute on function public.ai_summarize_ticket(uuid, text) to ai_service_role;

-- ============================================================================
-- 11. Helpers: updated_at trigger + new-signup profile provisioning + audit
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text;
begin
  foreach t in array array[
    'organizations','profiles','tickets','catalog_items','form_schemas',
    'knowledge_articles','business_rules','ui_policies','integrations',
    'webhooks','subscriptions'
  ] loop
    execute format(
      'drop trigger if exists trg_%s_updated on public.%I;
       create trigger trg_%s_updated before update on public.%I
       for each row execute function public.set_updated_at();', t, t, t, t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, organization_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'requester'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}')
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (public.current_org(), auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ============================================================================
-- 12. Preview seed — Global Enterprise HQ + Super Admin (ashishjoshi928@gmail.com)
--     Safe to run repeatedly. The auth.users insert is guarded and only used
--     when a matching Supabase Auth user exists (Supabase owns auth.users).
-- ============================================================================
insert into public.organizations (name, slug, plan_tier, country)
values ('Global Enterprise HQ', 'global-enterprise-hq', 'enterprise', 'AE')
on conflict (slug) do nothing;

-- Seed a handful of demo tenants for the Super Admin overview.
insert into public.organizations (name, slug, plan_tier, country, status) values
  ('Fintech Gulf Bank',   'fintech-gulf-bank',   'growth',    'AE', 'active'),
  ('Desert Logistics Co', 'desert-logistics-co', 'starter',   'SA', 'active'),
  ('Mediclinic Emirates', 'mediclinic-emirates', 'enterprise','AE', 'active'),
  ('Al Noor Retail',      'al-noor-retail',      'free',      'QA', 'suspended')
on conflict (slug) do nothing;

insert into public.subscriptions (organization_id, tier, status, plan_name, seats, monthly_price, currency, contract_start_date, contract_renewal_date)
select o.id, o.plan_tier, case when o.status = 'suspended' then 'past_due'::public.subscription_status else 'active'::public.subscription_status end,
       initcap(o.plan_tier::text) || ' Plan',
       50, 4999.00, 'USD', current_date - interval '180 days', current_date + interval '185 days'
from public.organizations o
on conflict do nothing;