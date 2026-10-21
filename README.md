ServiceHub Enterprise
Core Guidelines
Directory Layout: Always build modular, production-ready React components under /src/components/ organized strictly by persona:
/src/components/user/ (End-User Portal)
/src/components/agent/ (Agent Workspace)
/src/components/approver/ (Approver Workspace)
/src/components/admin/ (Platform Admin Console)
Production Completeness: Never use placeholder stubs, dummy functions, or // TODO comments for core business logic. Write fully typed TypeScript interfaces matching the Supabase/PostgreSQL database schema.
Error Handling: Implement robust React Error Boundaries (/src/components/common/ErrorBoundary.tsx) around complex data grids, form layout studios, and analytics dashboards.
Tenant Security: Ensure all database queries and state mutations strictly respect Row-Level Security (RLS) constraints and multi-tenant organization_id boundaries.
