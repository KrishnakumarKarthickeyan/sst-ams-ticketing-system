/**
 * SERVER-ONLY. Microsoft Teams webhook sender.
 *
 * This module is the ONLY place that talks to Microsoft Teams. It is imported
 * solely by the server-side dispatcher (src/lib/notifications/dispatcher.ts),
 * which is in turn reached only through the /api/notify route handler. It must
 * NEVER be imported by client code.
 *
 * Delivery target: a Microsoft Teams **Workflows (Power Automate)** webhook
 * created via the channel's "Post to a channel when a webhook request is
 * received" trigger — NOT the deprecated Office 365 connector. The trigger
 * expects an Adaptive Card wrapped in the `{ type:"message", attachments:[…] }`
 * envelope, which buildAdaptiveCard() produces.
 *
 * The webhook URL is read from process.env.TEAMS_WEBHOOK_URL (server-only secret,
 * never NEXT_PUBLIC_). If it is unset, every send is a silent no-op.
 */

type Severity = 'attention' | 'warning' | 'good' | 'accent' | 'default';

const SEVERITY: Record<string, { emoji: string; title: string; color: Severity }> = {
  sla_breached: { emoji: '🔴', title: 'SLA Breached', color: 'attention' },
  sla_at_risk: { emoji: '⚠️', title: 'SLA At Risk', color: 'warning' },
  escalation_raised: { emoji: '🚨', title: 'Escalation Raised', color: 'attention' },
  escalation_acknowledged: { emoji: '✅', title: 'Escalation Acknowledged', color: 'good' },
  ticket_created_critical: { emoji: '🔥', title: 'New Critical Ticket', color: 'attention' },
  closure_pending_approval: { emoji: '📝', title: 'Closure Pending Approval', color: 'accent' },
};

export interface TeamsCardInput {
  event: string;
  ticketNumber?: string;
  priority?: string;
  customerOrg?: string;
  message?: string;
  /** App-relative path, e.g. /manager/tickets/<id>. Combined with APP_BASE_URL. */
  linkPath?: string;
}

/**
 * Build the Microsoft Teams Workflows envelope wrapping a severity-styled
 * Adaptive Card. Returns the exact JSON the Workflows trigger expects.
 */
export function buildAdaptiveCard(input: TeamsCardInput) {
  const sev = SEVERITY[input.event] ?? { emoji: 'ℹ️', title: 'Notification', color: 'accent' as Severity };
  const base = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  const url = input.linkPath ? `${base}${input.linkPath}` : base || undefined;

  const facts = [
    input.ticketNumber ? { title: 'Ticket', value: input.ticketNumber } : null,
    input.priority ? { title: 'Priority', value: input.priority } : null,
    input.customerOrg ? { title: 'Customer', value: input.customerOrg } : null,
  ].filter((f): f is { title: string; value: string } => f !== null);

  const body: unknown[] = [
    { type: 'TextBlock', size: 'Large', weight: 'Bolder', color: sev.color, text: `${sev.emoji} ${sev.title}`, wrap: true },
  ];
  if (facts.length) body.push({ type: 'FactSet', facts });
  if (input.message) body.push({ type: 'TextBlock', text: input.message, wrap: true, spacing: 'Small', isSubtle: true });

  const adaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body,
    actions: url ? [{ type: 'Action.OpenUrl', title: 'View in Assist360', url }] : [],
  };

  // Workflows ("Post to a channel when a webhook request is received") envelope.
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: adaptiveCard,
      },
    ],
  };
}

/**
 * Fire-and-forget POST to the Microsoft Teams webhook. No-ops when the URL is
 * unset. Never throws — a non-2xx or network error is logged and swallowed so a
 * Teams outage can never break the user's ticket action.
 */
export async function postToTeams(card: unknown): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return; // unconfigured → silent no-op

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) {
      console.error(`[teams] webhook returned ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error('[teams] webhook post failed:', err);
  }
}
