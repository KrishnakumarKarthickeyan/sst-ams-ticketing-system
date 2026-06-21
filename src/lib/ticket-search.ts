/**
 * Exact ticket-number matching for search boxes.
 *
 * A plain substring match means typing "24" also returns BIT-000124, BIT-000240,
 * SUN-000171, etc. (corrections doc item 4). This matches a ticket number only when
 * the query equals the full number OR its numeric value equals the number's numeric
 * suffix — so "24" → BIT-000024 only, "BIT-000024" → that ticket. Free-text fields
 * (title, customer, description) should still use substring search alongside this.
 */
export function matchesTicketNumber(ticketNumber: string | null | undefined, query: string): boolean {
  const q = (query || '').trim().toLowerCase();
  if (!q) return false;
  const tnum = (ticketNumber || '').toLowerCase();
  if (!tnum) return false;
  if (tnum === q) return true;
  const qDigits = q.replace(/\D/g, '');
  const tDigits = tnum.replace(/\D/g, '');
  return qDigits.length > 0 && tDigits.length > 0 && Number(tDigits) === Number(qDigits);
}
