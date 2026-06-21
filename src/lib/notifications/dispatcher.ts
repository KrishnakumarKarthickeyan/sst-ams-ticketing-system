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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildAdaptiveCard, buildAdaptiveCardContent, postToTeams } from './teams';
import { isBotConfigured, postCardViaBot } from './teams-bot';

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

/** Events that are time-driven (no single actor) and may be detected concurrently. */
const DEDUPE_EVENTS = new Set<string>(['sla_breached', 'sla_at_risk']);

/**
 * @param db  The request's cookie-authenticated Supabase client. The in-app insert
 *            goes through the EXISTING create_notification RPC, which is SECURITY
 *            DEFINER and requires an authenticated caller (auth.uid()), so it must
 *            run under the user's session — exactly as the old client path did.
 */
export async function notify(event: NotifyEvent, payload: NotifyPayload, db: SupabaseClient): Promise<void> {
  // SLA breach/at-risk can be detected by many clients at once. De-dupe at the
  // source using the service-role client (bypasses RLS, sees every user's rows):
  // if a notification of this type already exists for the ticket, the breach was
  // already announced — skip BOTH the in-app insert and Teams so the event posts
  // at most once, ever, regardless of how many browsers fire it.
  if (DEDUPE_EVENTS.has(event) && payload.ticketId) {
    const admin = getAdminClient();
    if (admin) {
      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('ticket_id', payload.ticketId)
        .eq('type', payload.type ?? event)
        .limit(1);
      if (existing && existing.length > 0) return;
    }
  }

  // (a) ALWAYS — in-app rows via the existing create_notification RPC (one per
  // recipient), under the user's session so the SECURITY DEFINER auth check passes.
  const recipients = (payload.recipients || []).filter((r) => typeof r === 'string' && UUID_RE.test(r));
  await Promise.all(
    recipients.map(async (userId) => {
      try {
        const { error } = await db.rpc('create_notification', {
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

  // (b) SELECTED events only → Microsoft Teams. Fire-and-forget; never throws.
  // Prefer the Tier-2 "Assist360" bot when configured (sender chip = Assist360);
  // otherwise fall back to the Tier-1 webhook (sender chip = "Workflows"). The
  // webhook URL and bot secrets are read only inside teams.ts / teams-bot.ts.
  if (TEAMS_EVENTS.has(event)) {
    const cardInput = {
      event,
      ticketNumber: payload.ticketNumber,
      priority: payload.priority,
      customerOrg: payload.customerOrg,
      message: payload.message,
      linkPath: payload.linkPath,
    };
    try {
      if (isBotConfigured()) {
        const delivered = await postCardViaBot(buildAdaptiveCardContent(cardInput));
        if (!delivered) {
          console.warn('[notify] Teams bot configured but no chats have installed Assist360 yet — card not posted');
        }
      } else {
        await postToTeams(buildAdaptiveCard(cardInput));
      }
    } catch (err) {
      console.error('[notify] Teams dispatch failed (swallowed):', err);
    }
  }
}
