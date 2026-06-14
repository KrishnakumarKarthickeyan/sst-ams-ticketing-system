'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { truncateTick } from './chart-primitives';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, LabelList,
} from 'recharts';
import { ArrowUpDown, RefreshCw, ShieldAlert, RotateCcw } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { ChartCard, ChartTooltip } from './chart-primitives';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { supabase } from '../../lib/supabase/client';
import { CHART_COLORS, SEMANTIC, PRIORITY_COLOR } from '../../lib/chart-theme';
import {
  buildBuckets, bucketIndex, autoGranularity, isClosed,
  aggregateConsultants, type ConsultantAgg, utilizationBand,
  hasSlaTarget, slaBreached, resolutionHours,
} from '../../lib/analytics/derive';

interface Props {
  tickets: Ticket[];
  loading: boolean;
  now: number;
}

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

function businessDays(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0; const c = new Date(startMs); c.setHours(0, 0, 0, 0); const end = new Date(endMs);
  while (c <= end) { const d = c.getDay(); if (d !== 0 && d !== 6) n++; c.setDate(c.getDate() + 1); }
  return n;
}

const UTIL_INDICATOR: Record<'ok' | 'warning' | 'over', string> = {
  ok: 'bg-blue-600', warning: 'bg-amber-500', over: 'bg-red-600',
};

type SortKey = 'name' | 'handled' | 'avgResolutionH' | 'slaAdherence' | 'loggedHours' | 'utilization';

export function ManagerTeamPerformance({ tickets, loading, now }: Props) {
  const [reopenHistory, setReopenHistory] = useState<{ ticket_id: string; requested_at: string }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('handled');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Reopen history (all statuses) — the page only holds PENDING requests, so we
  // fetch the full set here to build an honest reopen-rate trend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('ticket_reopen_requests').select('ticket_id, requested_at');
      if (!cancelled && data) setReopenHistory(data as { ticket_id: string; requested_at: string }[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const { periodStart, periodEnd } = useMemo(() => {
    const created = tickets.map(t => new Date(t.createdAt).getTime()).filter(Number.isFinite);
    const activity = tickets.map(t => new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()).filter(Number.isFinite);
    return {
      periodStart: created.length ? Math.min(...created) : now,
      periodEnd: Math.max(now, ...(activity.length ? activity : [now])),
    };
  }, [tickets, now]);

  const capacityHours = useMemo(() => businessDays(periodStart, periodEnd) * 8, [periodStart, periodEnd]);

  const agg = useMemo(() => aggregateConsultants(tickets, now), [tickets, now]);
  const utilOf = (a: ConsultantAgg) => (capacityHours > 0 ? Math.round((a.loggedHours / capacityHours) * 100) : 0);

  const leaderboard = useMemo(() => {
    const rows = agg.map(a => ({ ...a, utilization: utilOf(a) }));
    const dir = sortDir === 'asc' ? 1 : -1;
    return rows.sort((x, y) => {
      const get = (r: typeof x) => {
        const v = r[sortKey];
        return v === null || v === undefined ? (sortKey === 'name' ? '' : -1) : v;
      };
      const a = get(x), b = get(y);
      if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b)) * dir;
      return ((a as number) - (b as number)) * dir;
    });
  }, [agg, sortKey, sortDir, capacityHours]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc'); }
  };

  // ── Charts ──
  const closedPer = useMemo(() => agg.map(a => ({ name: a.name, value: a.closed }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 12), [agg]);

  const ftSplit = useMemo(() => agg.map(a => ({ name: a.name, Functional: Math.round(a.functional * 10) / 10, Technical: Math.round(a.technical * 10) / 10 }))
    .filter(d => d.Functional + d.Technical > 0).slice(0, 12), [agg]);

  // Sort ASC (worst adherence first) so SLA breaches surface instead of hiding
  // behind the top performers.
  const slaByConsultant = useMemo(() => agg.filter(a => a.slaAdherence !== null)
    .map(a => ({ name: a.name, value: a.slaAdherence as number }))
    .sort((a, b) => a.value - b.value).slice(0, 12), [agg]);

  const buckets = useMemo(() => buildBuckets(periodStart, periodEnd, autoGranularity(periodStart, periodEnd)), [periodStart, periodEnd]);

  const demandVsClosed = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, Created: 0, Closed: 0 }));
    tickets.forEach(t => {
      const ci = bucketIndex(buckets, new Date(t.createdAt).getTime());
      if (ci >= 0) rows[ci].Created++;
      if (isClosed(t)) {
        const r = t.resolvedAt || t.closedAt;
        if (r) { const ri = bucketIndex(buckets, new Date(r).getTime()); if (ri >= 0) rows[ri].Closed++; }
      }
    });
    return rows;
  }, [buckets, tickets]);
  const demandEmpty = demandVsClosed.every(r => r.Created === 0 && r.Closed === 0);

  // Reopen rate (KPI) + trend (from ticket_reopen_requests, scoped to these tickets)
  const ticketIds = useMemo(() => new Set(tickets.map(t => t.id)), [tickets]);
  const reopenRate = useMemo(() => {
    if (tickets.length === 0) return 0;
    const reopened = tickets.filter(t => (t.reopenedCount || 0) > 0 || t.status === 'Reopened' || t.status === 'Reopen Requested').length;
    return Math.round((reopened / tickets.length) * 100);
  }, [tickets]);
  const reopenTrend = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    reopenHistory.forEach(r => {
      if (!ticketIds.has(r.ticket_id)) return;
      const i = bucketIndex(buckets, new Date(r.requested_at).getTime());
      if (i >= 0) rows[i].value++;
    });
    return rows;
  }, [buckets, reopenHistory, ticketIds]);
  const reopenTrendEmpty = reopenTrend.every(r => r.value === 0);

  // Demand heat: module × priority (stacked)
  const demandHeat = useMemo(() => {
    const m = new Map<string, { module: string; Critical: number; High: number; Medium: number; Low: number }>();
    tickets.forEach(t => {
      if (!t.sapModule) return;
      let row = m.get(t.sapModule);
      if (!row) { row = { module: t.sapModule, Critical: 0, High: 0, Medium: 0, Low: 0 }; m.set(t.sapModule, row); }
      if (t.priority && PRIORITIES.includes(t.priority)) (row as Record<string, number | string>)[t.priority] = (row[t.priority as 'Critical'] as number) + 1;
    });
    return Array.from(m.values()).sort((a, b) =>
      (b.Critical + b.High + b.Medium + b.Low) - (a.Critical + a.High + a.Medium + a.Low)).slice(0, 10);
  }, [tickets]);

  // Quality KPIs
  const quality = useMemo(() => {
    const total = tickets.length || 1;
    const escalated = tickets.filter(t => t.escalationFlag).length;
    const reopensTotal = tickets.reduce((s, t) => s + (t.reopenedCount || 0), 0);
    const closed = tickets.filter(isClosed);
    const onTime = closed.filter(t => hasSlaTarget(t) && !slaBreached(t, now));
    const closedWithSla = closed.filter(hasSlaTarget);
    return {
      escalationRate: Math.round((escalated / total) * 100),
      avgReopens: Math.round((reopensTotal / total) * 100) / 100,
      onTimeClosure: closedWithSla.length ? Math.round((onTime.length / closedWithSla.length) * 100) : null,
    };
  }, [tickets, now]);

  const slaColor = (pct: number) => (pct >= 95 ? SEMANTIC.success : pct >= 80 ? SEMANTIC.warning : SEMANTIC.danger);
  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}<ArrowUpDown className={`h-3 w-3 ${sortKey === k ? 'text-foreground' : 'text-muted-foreground/50'}`} />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* ── TEAM PERFORMANCE ── */}
      <h3 className="mt-8 mb-4 text-lg font-semibold tracking-tight">Team Performance</h3>

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h4 className="text-sm font-semibold">Consultant Leaderboard</h4>
          <p className="text-xs text-muted-foreground">Tap a column to sort. Utilization = approved logged hours vs ≈{capacityHours}h capacity.</p>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <Th k="name" label="Consultant" />
                <Th k="handled" label="Handled" className="text-right" />
                <Th k="avgResolutionH" label="Avg Res (h)" className="text-right" />
                <Th k="slaAdherence" label="SLA %" className="text-right" />
                <Th k="loggedHours" label="Logged (h)" className="text-right" />
                <Th k="utilization" label="Utilization" className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No consultant activity for this period.</TableCell></TableRow>
              ) : leaderboard.map(r => {
                const band = utilizationBand(r.utilization);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.handled}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.avgResolutionH !== null ? r.avgResolutionH.toFixed(1) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.slaAdherence !== null ? `${r.slaAdherence}%` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.loggedHours.toFixed(1)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.utilization} indicatorClassName={UTIL_INDICATOR[band]} className="h-2 flex-1" />
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.utilization}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tickets Closed per Consultant */}
        <ChartCard title="Tickets Closed per Consultant" isEmpty={closedPer.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={closedPer} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Closed" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Functional vs Technical Effort Split */}
        <ChartCard title="Functional vs Technical Effort Split" isEmpty={ftSplit.length === 0} emptyHint="No approved closure effort logged yet">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ftSplit} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} unit="h" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Functional" stackId="ft" fill={CHART_COLORS[0]} barSize={16} />
              <Bar dataKey="Technical" stackId="ft" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* SLA Adherence by Consultant */}
        <ChartCard title="SLA Adherence by Consultant" isEmpty={slaByConsultant.length === 0} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slaByConsultant} margin={{ top: 16, right: 16, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={72} tickFormatter={truncateTick} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={48} unit="%" />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="SLA Adherence" radius={[4, 4, 0, 0]} barSize={28}>
                {slaByConsultant.map(d => <Cell key={d.name} fill={slaColor(d.value)} />)}
                <LabelList dataKey="value" position="top" fontSize={11} formatter={(v) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── DEMAND & QUALITY ── */}
      <h3 className="mt-8 mb-4 text-lg font-semibold tracking-tight">Demand &amp; Quality</h3>

      {/* Quality KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escalation Rate</p><ShieldAlert className="h-4 w-4 text-muted-foreground" /></div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{quality.escalationRate}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg Reopens / Ticket</p><RotateCcw className="h-4 w-4 text-muted-foreground" /></div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{quality.avgReopens}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">On-time Closure</p><RefreshCw className="h-4 w-4 text-muted-foreground" /></div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{quality.onTimeClosure !== null ? `${quality.onTimeClosure}%` : '—'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Demand vs Closed */}
        <ChartCard title="Demand vs Closed" isEmpty={demandEmpty} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandVsClosed} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Line type="linear" dataKey="Created" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="linear" dataKey="Closed" stroke={SEMANTIC.success} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Reopen Rate */}
        <ChartCard
          title="Reopen Requests Trend"
          isEmpty={reopenTrendEmpty}
          emptyHint="No reopen requests in this period"
          action={<span className="text-xs text-muted-foreground">Reopen rate {reopenRate}%</span>}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={reopenTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="linear" dataKey="value" name="Reopens" stroke={SEMANTIC.warning} strokeWidth={2} dot={{ r: 3, fill: SEMANTIC.warning }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* SLA Breach: First-Response vs Resolution — first-response SLA is not tracked in the schema */}
        <ChartCard
          title="SLA Breach: First-Response vs Resolution"
          isEmpty
          emptyHint="First-response SLA isn't tracked in the schema — only resolution SLA is recorded."
        >
          <div />
        </ChartCard>

        {/* Demand Heat: Module × Priority */}
        <ChartCard title="Demand Heat — Module × Priority" isEmpty={demandHeat.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandHeat} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="module" tick={{ fontSize: 12 }} width={70} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
              {PRIORITIES.map((p, i) => (
                <Bar key={p} dataKey={p} stackId="prio" fill={PRIORITY_COLOR[p]} barSize={16} radius={i === PRIORITIES.length - 1 ? [0, 4, 4, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
