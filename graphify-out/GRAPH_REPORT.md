# Graph Report - sap-ticketing-system  (2026-05-29)

## Corpus Check
- 108 files · ~140,897 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 442 nodes · 1059 edges · 23 communities (16 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6bad6d11`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 67 edges
2. `useTickets()` - 57 edges
3. `cn()` - 27 edges
4. `Badge()` - 23 edges
5. `Card` - 20 edges
6. `CardContent` - 20 edges
7. `CardHeader` - 19 edges
8. `CardTitle` - 19 edges
9. `compilerOptions` - 16 edges
10. `Ticket` - 14 edges

## Surprising Connections (you probably didn't know these)
- `AdminTicketsPage()` --calls--> `useTickets()`  [EXTRACTED]
  src/app/admin/tickets/page.tsx → src/context/TicketContext.tsx
- `AdminManagersPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/admin/managers/page.tsx → src/context/AuthContext.tsx
- `AdminUsersPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/admin/users/page.tsx → src/context/AuthContext.tsx
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `ConsultantLookup` --references--> `SAPModule`  [EXTRACTED]
  src/components/tickets/TicketDetailsView.tsx → src/types/ticket.ts

## Communities (23 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (37): CustomerCreateTicketPage(), ManagerCreateTicketPage(), DashboardStats, KpiCardsProps, MONTH_OPTIONS, ReportType, AttachmentQueueItem, AVAILABLE_MODULES (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (61): TicketCard(), TicketCardProps, TicketContext, TicketContextType, ReportsViewProps, ReportType, ConsultantTicketDetailsViewProps, MOCK_MENTIONABLE_USERS (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (23): AdminLayout(), metadata, ConsultantLayout(), AdminConsultantsPage(), ConsultantWorkload, AuthContext, AuthContextType, AuthProvider() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (46): COLORS, CONSULTANTS_DB, ManagerDashboardPage(), SAP_MODULES_LIST, SYSTEM_NOW, CustomerTicketDetailPage(), PendingAttachment, cn() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (38): dependencies, class-variance-authority, clsx, lucide-react, next, @radix-ui/react-avatar, @radix-ui/react-collapsible, @radix-ui/react-dialog (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (29): 1. Database Fallback Synchronization, 1. Database Migration & RLS Shielding, 1. Database Schema Alignment & Seeding, 1. Manager Home Dashboard Cockpit, 1. Month Selector & Dynamic Working Hours Calculator, 2. Consultants & Customers 360 Workspace, 2. Core Context Uplift & Supabase Storage File Uploads, 2. Multi-Resource Allocations & Lead Assignment (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (12): createAuthUser(), deleteAuthUser(), getAdminClient(), getOrganizationMap(), provisionUser(), updateAuthUserPassword(), ConsultantProfile, CustomerProfile (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (27): ConsultantMyTicketsPage(), priorityConfig, statusConfig, CustomerTicketsPage(), PendingAttachment, ChartConfig, ChartContainer, ChartContainerProps (+19 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (22): ManagerConsultantsPage(), CustomerContactsPage(), useTickets(), AdminContractsPage(), AdminCreateTicketPage(), AdminDashboardPage(), ConsultantDashboardPage(), CustomerDashboardPage() (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (8): { createClient }, env, envContent, envPath, fs, match, path, supabase

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **186 isolated node(s):** `{ createClient }`, `fs`, `path`, `envPath`, `envContent` (+181 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `useTickets()` connect `Community 10` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 9`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 9`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `{ createClient }`, `fs`, `path` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09764309764309764 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06139240506329114 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12312312312312312 - nodes in this community are weakly interconnected._