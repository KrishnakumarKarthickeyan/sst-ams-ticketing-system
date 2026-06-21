/**
 * Client-safe entry to the single notification dispatcher.
 *
 * This contains NO Microsoft Teams knowledge and NO secrets — it only POSTs to
 * the server route /api/notify, which runs the real dispatcher (notify) and is
 * the one place that talks to Teams. The browser never sees the Teams webhook secret.
 *
 * Fire-and-forget: failures are swallowed so a notification/Teams problem can
 * never break the user's originating action (the caller has already applied its
 * optimistic in-app update).
 */
export interface DispatchNotifyPayload {
  /** Resolved profile UUIDs that receive the in-app notification. */
  recipients: string[];
  title: string;
  message: string;
  ticketId?: string;
  ticketNumber?: string;
  priority?: string;
  customerOrg?: string;
  linkPath?: string;
  /** DB notification `type` column. Defaults to the event on the server. */
  type?: string;
}

export async function dispatchNotify(event: string, payload: DispatchNotifyPayload): Promise<void> {
  const recipients = (payload.recipients || []).filter((r) => typeof r === 'string' && r.length > 0);
  if (recipients.length === 0) return;
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload, recipients }),
      keepalive: true,
    });
  } catch {
    /* swallow — never break the originating user action over a notification */
  }
}
