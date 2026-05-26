# SAP AMS Enterprise Portal Redesign Walkthrough

This document tracks the layout overhauls, metrics engines, and enterprise routing workspaces implemented across the SAP Consultant and SAP Manager modules of the AMS platform.

---

## Part 1: SAP AMS Consultant Cockpit Redesign

The Consultant Dashboard has been completely rebuilt as an enterprise-grade SAP AMS Operations Cockpit and Performance Command Center.

### 1. Month Selector & Dynamic Working Hours Calculator
* **Month Selector**: A dropdown menu at the top of the dashboard containing options from **December 2025** through **August 2026**.
* **Expected Hours Calculation**:
  * Calculates expected capacity by multiplying the number of working days in the selected month by 8.
  * **Working Days**: Sunday, Monday, Tuesday, Wednesday, Thursday.
  * **Non-Working Days**: Fridays and Saturdays are skipped and not counted.
  * Displays: Expected Hours, Actual Logged Hours, Remaining Capacity, and Utilization % (Actual Hours ÷ Expected Hours).

### 2. My Performance Command Center (Executive Scores)
* **Utilization Gauge**: A custom circular gauge representation displaying the capacity utilization percentage.
* **Productivity Score**: A performance grade out of 100 calculated from resolved tickets and cycle times.
* **SLA Score**: Real-time SLA Compliance percentage (target: 95%).
* **Resolution Score**: Mapped score reflecting the average ticket resolution cycle speed.
* **Workload Score**: Balance indicators (assigned active items vs capacity).
* **Billable Efficiency**: Muted indicator displaying billable hours as a percentage of actual logged hours.

### 3. AMS Operations & Performance Audit Center
* **A. Consultant Capacity Utilization**: Available Hours, Planned Hours, Actual Hours, Utilization %, Billable %, and Non-Billable %.
* **B. Delivery Performance & SLAs**: Closed work items, resolution speed, reopened backlogs, SLA compliance %, closure request approval %, and first response compliance.
* **C. Customer Portfolio Split**: Active customers count and a table showing top customers by effort (hours spent), volume, and open backlogs.
* **D. SAP Modules Audit Split**: Outlines module performance, actual logged hours, count, and open distribution.
* **E. Workload Allocation Health**: A visual workload track showing whether the consultant is **Underutilized** (<70%), **Optimal/Healthy** (70%-92%), or **Overloaded** (>92%) with a glowing layout indicator.

### 4. Achievements & Milestones
* **Productivity Peak**: The weekday when the consultant resolves the most tickets (e.g. Tuesday / Monday).
* **Workload Record**: The week of peak closure volume.
* **Customer Focus**: The longest active customer support relationship.
* **Most Worked Module**: Calculated module focus based on actual logged hours.

### 5. Advanced Analytics Hub
* **Ticket Volume Split**: Monthly Incoming Volume Trend, SLA Adherence Compliance, and Resolution Cycle Speed.
* **Effort Analytics**: Monthly Logged Hours Trend (Billable vs Non-Billable), Efforts by Customer, and Efforts by SAP Module.
* **Portfolio Share**: Ticket Volume by Customer, Ticket Count by SAP Module, and Open Tickets by Customer.

---

## Part 2: SAP Manager Module Delivery Command Center Overhaul

The SAP Manager Module has been fully restructured into a central Delivery Command Center and Operations Control Tower, designed to oversee 70+ consultants, 40+ customers, and hundreds of active tickets.

### 1. Manager Home Dashboard Cockpit
* **Enterprise Control Tower Layout**: Completely redesigned the dashboard cockpit to display four high-impact operational control modules in a grid:
  1. **Operational Backlog Tower**: Monitors Action Required items (Unassigned/Reopened), Critical Backlogs, SLA Breaches, Awaiting Assignments, Awaiting Effort Approvals, Awaiting Closures, Reopened Incidents, Raised to SAP (OSS), and Customer Action Pending items.
  2. **Resource Capacity Control**: Monitors Overloaded consultants count, Underutilized counts, consultants with pending closure requests, and actual hours waiting for approval. Displays visual overload warnings and real-time load bars for active engineers (e.g. Priya Raman - 96% load, Arjun Mehta - 94% load).
  3. **Customer Portfolio Health**: Tracks organizations with critical backlogs, SLA breaches, awaiting closure counts, and top customers by ticket volume.
  4. **Governance & Approvals**: Summarizes timesheets pending approval, closures pending, reopens pending, and resource change requests. Includes quick navigation controls to the Approvals Workspace and SLA monitors.

### 2. Consultants & Customers 360 Workspace
* **Consultants 360 Tab**: Renders active consultant profiles mapping their core SAP module expertise, current active workloads, monthly utilization indexes, and administrative actions (Add Consultant, Edit Profile, Reset Password, Disable Profile).
* **Customers 360 Tab**: Details active contracts, contact points, SLA targets, average CSAT, and open Backlogs.
* **Governance Audit tab**: Exposes 5 direct CSV download links to extract governance spreadsheets (Allocations log, Escalation log, Configuration overrides, Security audits, and Change management trail).
* **Persistence**: Fully functional client-side CRUD synced to `localStorage`.

### 3. Timesheet & Workflow Approvals Workspace
* **6-Tab Layout**: Unified interface splitting approvals into:
  1. **Estimated Hours**: Initial estimates (New Quotes) and revision requests.
  2. **Actual Hours**: Timesheet logs with status filters.
  3. **Closures**: Closure approval requests.
  4. **Reopen Requests**: Client ticket reopens waiting for manager audit.
  5. **Unlocks**: Work log unlock requests.
  6. **Other Requests**: Soft Delete requests awaiting manager approval.
* **Approval Redirection Workflow**: When a manager clicks "Approve" for a pending closure request in the Approvals Workspace, the system automatically redirects them to the Ticket Details page with a query parameter `?approveClosure=[id]`. This triggers the mandatory CSAT evaluation dialog in context, enforcing the unified review workspace model.
* **Mandatory Rejection Comments**: Replaced standard JS alerts/prompts with a custom state-driven rejection dialog. Submitting any rejection requires typing a justification, logged in the audit trail.

### 4. Resource Allocation Workspace & Assignment Controls
* **Primary Lead Consultant Selector**: Added a primary lead assignment selector inside the Resource tab to allow managers to change or reassign the primary lead resource at any time.
* **Inline Resource Allocations**: All resource allocations (adding, removing, replacing) are handled directly in the Ticket Details page assignments tab.
* **Grouped Consultant Tables**: Roster split into two tables: **Functional Resources** and **Technical Resources**. Managers can add functional/technical consultants, adjust hourly estimates inline, replace allocations using a dynamic selector, or remove them entirely without restrictions.
* **Impact of Allocations**: New resource allocations dynamically expand ticket visibility so that added consultants instantly see tickets in their My Tickets workspace, participate in discussion threads, log actual effort, and submit closure requests.

### 5. Ticket Detail Page Enhancements & Mandatory CSAT Dialog
* **Single Workspace Control Desk**: All operational features are unified in the Ticket Details page: status modifications, resource additions/removals/reassignments, hours approval, comments threads, internal notes, attachments registry, and closure workflows.
* **Mandatory CSAT Closure Review Dialog**: Transitioning a ticket to "Closed" (via status controls or by clicking "Approve Closure" in sidebar actions) intercepts the workflow and displays a detailed evaluation overlay:
  * **Functional Consultants Hour Breakdown**: Names, estimated hours, and logged actual hours.
  * **Technical Consultants Hour Breakdown**: Names, estimated hours, and logged actual hours.
  * **Effort Totals**: Functional total actual, Technical total actual, and Grand Total actual.
  * **Consultant Deliverables summaries**: Work Completed, Root Cause, Resolution Summary, and Closure Notes.
  * **Mandatory CSAT Input**: Star rating (1-5 stars) and feedback comments text area are strictly mandatory. The "Confirm Closure" button remains disabled until both parameters are populated.

### 6. Ticket Desk & SLA Monitor Restyle
* **Vercel-like Filter Standards**: Standardized inputs, search boxes, and dropdowns with thin borders and minimal neutral styling.
* **Tabular lists**: Replaced large cards with compact data tables displaying Ticket ID, Subject, Customer Account, Priority, Status, Lead Consultant, and SLA Countdown Badges.
* **SLA Countdown Engine**: Automatically resolves remaining hours or days, flagging overdue entries in pulsating red warnings and near-breaches in amber.

### 7. Knowledgebase Center
* **Wiki publisher form**: Features clean borderless styling and custom categorizations.
* **Inspect overlay Reader**: Replaced primitive browser alerts with an overlay reader showing the full article text, author credits, published date, and internal visibility flags.

---

## Visual & Design Standards Implemented

* **Zero Emojis**: Fully removed all emojis from page headers, tab lists, tables, cards, and titles.
* **Monochrome Outlines**: Standardized Lucide icons with neutral slate-grays (`text-zinc-500` / `text-zinc-700`) without colorful circle backgrounds.
* **Semantic Color Schemes**: Aligned compliance tags across all views: Green (MET/Closed/Approved/Healthy), Red (BREACHED/Critical/Rejected/Overdue), Amber (Pending/Customer Action/OSS Raised/Warning), Blue (In Progress/Active/Assigned).
