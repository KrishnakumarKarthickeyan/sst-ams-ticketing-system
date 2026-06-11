<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CodeGraph + Caveman + RTL Execution Framework (MANDATORY)

Every task follows this order — no direct implementation, no isolated fixes, no assumptions:

1. **Caveman Analysis** — before any code: problem statement, root cause, current vs expected behavior, affected users/screens/workflows/components/APIs/tables/policies/dashboards/notifications/realtime events, dependency risks, implementation + validation + regression strategy.
2. **CodeGraph Analysis** — run `codegraph sync`, then `codegraph impact <symbol>`, `codegraph callers <symbol>`, `codegraph callees <symbol>`, `codegraph affected [files...]` to map frontend/backend/database/auth/storage/realtime/dashboard/permission impact. No file may be modified until this is complete. (v0.9.9 note: there is no `codegraph context` subcommand — use `codegraph query` and `codegraph files`.)
3. **RTL (Reasoning Task List)** — numbered tasks, each with description, dependencies, risk level, validation criteria, completion criteria, affected modules and users.
4. **Implementation** → 5. **Validation** → 6. **Regression testing** → 7. **Production readiness check** (no console/network errors, no broken queries, no stale cache, no auth/dashboard/workflow/realtime/security/UI regressions).

Platform governance invariants:
- **Supabase is the ONLY source of truth** — no mock data, placeholder data, static arrays, hardcoded counts, or fake analytics in any card, table, chart, dashboard, report, notification, filter, or export.
- **SLA defaults**: Critical 8h, High 16h, Medium 32h, Low 64h — must agree across frontend, backend, database, reports, dashboards, notifications, escalations (org-level overrides live in `organizations`, global config in `sla_configuration`).
- **Performance targets**: login < 2s, dashboard < 2s, navigation < 1s, realtime < 500ms, chart render < 1s.
- After modifying code run BOTH `npm run graphify` and `codegraph sync`.

# Graphify Integration Rules

This project maintains a codebase knowledge graph using Graphify.

1. **Navigation**: Consult the Graphify index in `graphify-out/` before scanning or reading arbitrary files when searching for codebase structure.
2. **Maintenance**: You MUST run `npm run graphify` (which executes `graphify update .`) immediately after modifying any code files to rebuild the AST dependency graph.
3. **RLS & Security**: Check RLS policies in `supabase/migrations/` (latest tickets/profiles policies: `20260611000002_security_hardening_rls.sql`) to ensure multi-consultant support via `ticket_consultant_efforts` is maintained for all new/modified ticket query and effort logging features.

