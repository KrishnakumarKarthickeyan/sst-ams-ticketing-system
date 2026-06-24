/**
 * Narrow an unknown caught value (TS `strict` makes catch variables `unknown`)
 * to a human-readable message — the one place that knows how to read .message
 * off an Error / Supabase error / string without resorting to `any`.
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (m != null) return String(m);
  }
  // Return '' (not a generic string) so existing `getErrorMessage(e) || 'specific…'`
  // fallbacks keep producing their specific message.
  return '';
}
