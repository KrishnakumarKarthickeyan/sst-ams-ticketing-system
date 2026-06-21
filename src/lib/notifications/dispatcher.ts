/**
 * SERVER-ONLY. The single notification dispatcher.
 *
 * notify(event, payload) is the ONE chokepoint for outbound notifications. It:
 *   (a) ALWAYS inserts in-app notification rows for `recipients` via the EXISTING
 *       create_notification RPC (the SECURITY DEFINER path; no duplicated INSERT SQL).
 *   (b) ONLY for the Teams-enabled event set, ALSO posts a Microsoft Teams Adaptive
 *       Card via the webhook (src/lib/notifications/teams.ts).
 *
 * Teams delivery is fire-and-forget: it is wrapped in try/catch and can never
 * block or fail the in-app insert or the user's originating action.
 *
 * Reached only through the server route /api/notify. Never imported by client code.
 */
import { createClient } from '@supabase/supabase-js';
import { buildAdaptiveCard, postToTeams } from './teams';

export type NotifyEvent =
  // ── Events that fan out to Microsoft Teams ──
  | 'sla_breached'
  | 'sla_at_risk'
  | 'escalation_raised'
  | 'escalation_acknowledged'
  | 'ticket_created_critical'
  | 'closure_pending_approval'
  // ── All other existing in-app event types stay in-app only ──
  | (string & {});

/** The ONLY events that post to Microsoft Teams. Everything else is in-app only. */
export const TEAMS_EVENTS: ReadonlySet<string> = new Set([
  'sla_breached',
  'sla_at_risk',
  'escalation_raised',
  'escalation_acknowledged',
  'ticket_created_critical',
  'closure_pending_approval',
]);

export interface NotifyPayload {
  /** Resolved profile UUIDs that receive the in-app notification. */
  recipients: string[];
  title: string;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  priority?: string;
  customerOrg?: string;
  /** App-relative deep link, e.g. /manager/tickets/<id>. */
  linkPath?: string;
  /** DB notification `type` column — preserves existing in-app categorisation. Defaults to `event`. */
  type?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
};

export async function notify(event: NotifyEvent, payload: NotifyPayload): Promise<void> {
  // (a) ALWAYS — in-app rows via the existing create_notification RPC (one per recipient).
  const admin = getAdminClient();
  if (admin) {
    const recipients = (payload.recipients || []).filter((r) => typeof r === 'string' && UUID_RE.test(r));
    await Promise.all(
      recipients.map(async (userId) => {
        try {
          const { error } = await admin.rpc('create_notification', {
            p_user_id: userId,
            p_title: payload.title,
            p_message: payload.message,
            p_ticket_id: payload.ticketId ?? null,
            p_type: payload.type ?? event,
            p_link_path: payload.linkPath ?? null,
          });
          if (error) console.warn('[notify] create_notification failed:', error.message);
        } catch (err) {
          console.error('[notify] create_notification threw:', err);
        }
      }),
    );
  }

  // (b) SELECTED events only → Microsoft Teams. Fire-and-forget; never throws.
  // The webhook URL is read solely inside teams.ts (postToTeams no-ops if unset),
  // so this dispatcher never references the secret directly.
  if (TEAMS_EVENTS.has(event)) {
    try {
      await postToTeams(
        buildAdaptiveCard({
          event,
          ticketNumber: payload.ticketNumber,
          priority: payload.priority,
          customerOrg: payload.customerOrg,
          message: payload.message,
          linkPath: payload.linkPath,
        }),
      );
    } catch (err) {
      console.error('[notify] Teams dispatch failed (swallowed):', err);
    }
  }
}
