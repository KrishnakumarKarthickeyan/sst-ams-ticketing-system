/**
 * Canonical temporary-password generator. Single source of truth for every
 * provisioning / reset flow (admin + manager, all roles). Produces a STRONG
 * password that always satisfies the Supabase password policy:
 *   • length >= 14 (well above the 12-char minimum, with headroom)
 *   • at least one uppercase, one lowercase, one digit, and one symbol
 * Confusable characters (I/O/l/0/1) are excluded so the temp password is easy
 * to read aloud / copy. Uses crypto-grade randomness when available.
 */

const UPPERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O
const LOWERS = 'abcdefghijkmnopqrstuvwxyz'; // no l
const NUMBERS = '23456789'; // no 0, 1
const SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL = UPPERS + LOWERS + NUMBERS + SPECIALS;

/** Cryptographically strong index in [0, max) with a safe Math.random fallback. */
function randInt(max: number): number {
  const g = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (g && typeof g.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    g.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

const pick = (set: string) => set[randInt(set.length)];

/**
 * Generate a compliant temporary password. Minimum (and default) length is 14;
 * a smaller `length` is clamped up to 14 so callers can never under-shoot policy.
 */
export function generateTemporaryPassword(length = 16): string {
  const len = Math.max(14, Math.floor(length) || 14);

  // Guarantee one of each required class, then fill from the full alphabet.
  const chars = [pick(UPPERS), pick(LOWERS), pick(NUMBERS), pick(SPECIALS)];
  while (chars.length < len) chars.push(pick(ALL));

  // Fisher–Yates shuffle so the guaranteed classes aren't always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
