/**
 * Pure analytical breakdowns shared by the Manager and Customer dashboards.
 * Framework-free and unit-tested. Every function reads only mapped Ticket
 * fields that come from Supabase — no synthetic data, and each returns an
 * empty array / null when there's nothing to show so the UI can render an
 * honest empty state instead of a fake chart.
 */

export interface Ticketish {
  status: string;
  priority?: string;
  ticketType?: string;
  category?: string;
  classification?: string;
  businessImpact?: string;
  reopenedCount?: number;
  createdAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaDueAt?: string;
}

export interface Slice { name: string; value: number }

const isClosed = (t: Ticketish) => t.status === 'Closed' || t.status === 'Resolved';

/** Count tickets by a string field, dropping blanks, sorted desc. */
export function countBy<T extends Ticketish>(tickets: T[], field: keyof Ticketish): Slice[] {
  const map: Record<string, number> = {};
  tickets.forEach(t => {
    const v = t[field];
    if (v === undefined || v === null || v === '') return;
    map[String(v)] = (map[String(v)] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Ticket type mix (Incident / Request / Change …). */
export const typeMix = (t: Ticketish[]) => countBy(t, 'ticketType');

/** Issue category breakdown (Workflow / Transaction Error …). */
export const categoryBreakdown = (t: Ticketish[]) => countBy(t, 'category');

/** Functional vs Technical scope. */
export const classificationSplit = (t: Ticketish[]) => countBy(t, 'classification');

const IMPACT_RANK: Record<string, number> = { Critical: 0, Major: 1, Moderate: 2, Minor: 3 };
const shortImpact = (s: string) => s.replace(/\s*Business Impact\s*/i, '').trim() || s;

/** Business-impact distribution, ordered most→least severe with short labels. */
export function businessImpactDist(tickets: Ticketish[]): Slice[] {
  const map: Record<string, number> = {};
  tickets.forEach(t => {
    if (!t.businessImpact) return;
    const label = shortImpact(t.businessImpact);
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (IMPACT_RANK[a.name] ?? 9) - (IMPACT_RANK[b.name] ?? 9));
}

/** Average resolution hours per priority (only priorities with resolved tickets). */
export function resolutionByPriority(tickets: Ticketish[]): { name: string; value: number; n: number }[] {
  const order = ['Critical', 'High', 'Medium', 'Low'];
  return order.map(p => {
    const done = tickets.filter(t => t.priority === p && isClosed(t) && (t.resolvedAt || t.closedAt));
    const avg = done.length
      ? done.reduce((s, t) => s + (new Date(t.resolvedAt || t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600e3, 0) / done.length
      : 0;
    return { name: p, value: Math.round(avg * 10) / 10, n: done.length };
  }).filter(d => d.n > 0);
}

/** SLA compliance per priority tier (incidents with a target). */
export function slaByPriority(tickets: Ticketish[], now: number): { name: string; pct: number; met: number; breached: number }[] {
  const order = ['Critical', 'High', 'Medium', 'Low'];
  const out: { name: string; pct: number; met: number; breached: number }[] = [];
  for (const p of order) {
    const inc = tickets.filter(t => t.priority === p && (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
    if (inc.length === 0) continue;
    const breached = inc.filter(t => {
      const due = new Date(t.slaDueAt!).getTime();
      const end = isClosed(t) ? new Date(t.resolvedAt || t.closedAt || now).getTime() : now;
      return end > due;
    }).length;
    out.push({ name: p, pct: Math.round(((inc.length - breached) / inc.length) * 100), met: inc.length - breached, breached });
  }
  return out;
}

/** Quality summary: reopen rate + resolution stats. */
export function qualityStats(tickets: Ticketish[]): { reopenRate: number | null; reopened: number; resolved: number; avgResolution: number | null } {
  const total = tickets.length;
  const reopened = tickets.filter(t => (t.reopenedCount ?? 0) > 0).length;
  const done = tickets.filter(t => isClosed(t) && (t.resolvedAt || t.closedAt));
  const avg = done.length
    ? done.reduce((s, t) => s + (new Date(t.resolvedAt || t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600e3, 0) / done.length
    : null;
  return {
    reopenRate: total > 0 ? Math.round((reopened / total) * 1000) / 10 : null,
    reopened,
    resolved: done.length,
    avgResolution: avg === null ? null : Math.round(avg * 10) / 10,
  };
}
