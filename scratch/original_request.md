<USER_REQUEST>
You are in the sst-ams-ticketing-system repo. Stages 1–4 from the previous run are
considered done. This run does ONLY the remaining 4 fixes. Commit + push after EACH stage.
If any stage exceeds ~200 lines or verification fails, STOP, commit, push, and ask.

================================================================
STAGE A — CUSTOMER TICKET VIEW: CARD/LIST TOGGLE + RESTRAINED PALETTE
================================================================

A1. LIST view on the customer ticket list page (src/app/customer/tickets/page.tsx):
  - Top-right of the page header, add a shadcn ToggleGroup with two options:
    "Card" (LayoutGrid icon) and "List" (List icon). Persist choice in
    localStorage under key 'customer.ticketView' (default = 'card').
  - Keep the existing card grid for 'card'. For 'list', render a shadcn Table:
      columns: Ticket # | Title | Module | Status | Priority | Created | SLA
      sort: created_at DESC by default
      row click navigates to the same ticket detail page

A2. TICKET DETAIL palette (src/app/customer/tickets/[id]/page.tsx):
  Current state shows a purple→pink gradient top border, a purple Submitted icon, a
  purple lightning-bolt icon, a pink gear icon, and mixed pastel badges. Replace with a
  single restrained palette using ONLY shadcn primitives:

  - REMOVE the gradient top border entirely (no decorative bar).
  - Status badges (NEW, INCIDENT, HIGH, etc.) — shadcn Badge variants only:
      NEW           -> variant="secondary"
      INCIDENT      -> variant="outline"
      HIGH          -> variant="destructive"
      ESCALATED     -> variant="destructive"
      CLOSED        -> variant="default" with success styling
  - Workflow stages (Submitted/Assigned/In Progress/Resolved/Closed):
      Active stage  -> bg-primary text-primary-foreground icon
      Past stages   -> bg-muted text-muted-foreground icon
      Future stages -> border border-muted, text-muted-foreground icon, no fill
      NO purple, pink, blue, or rainbow. Single primary color o
<truncated 5757 bytes>
re-filled with
      that consultant's current logged sum. Lead can adjust.
    - Submit:
        * insert one ticket_closure_requests row (existing flow)
        * insert/update per-consultant final hours rows
        * set tickets.status = 'Pending Closure'
        * call router.refresh() so dashboards re-render

D4. Manager approval (existing approval flow):
    - On approve:
        * set tickets.status = 'Closed'
        * mark the per-consultant final hours rows approvalStatus='approved'
        * call router.refresh()
    - On reject:
        * set tickets.status back to its prior state
        * record reason on the closure request row

D5. MANDATORY VERIFICATION — walk through one real ticket and print to me:
    (i)   the lead consultant's name
    (ii)  every other consultant on that ticket whose button is disabled
    (iii) ticket status after lead submits
    (iv)  ticket status after manager approves
    If any of these doesn't behave per spec, STOP and report exactly where it broke.

Commit: "feat: closure flow gated to lead consultant with team-wide hours and manager approval"
Push.

================================================================
FINAL
================================================================
- `npm run build` must pass.
- `git log --oneline -n 6` and `git status` (clean).
- Summary with:
    * Stage status (Done/Partial/Skipped)
    * Stage C: list of 4 pages using AttachmentPanel + the migration filename
    * Stage D: closure walkthrough output and the migration filename
- Remind me to run any migration files listed and to redeploy.

NON-NEGOTIABLE:
- shadcn/ui only. No custom hex colors except --primary / --destructive.
- Stage A2: do NOT keep the purple/pink gradient on the ticket detail page.
- Stages C and D: if verification doesn't match the spec, STOP — do NOT ship a "done" that
  leaves manager downloads broken or non-leads able to raise closure.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-06-08T11:35:34+05:30.
</ADDITIONAL_METADATA>