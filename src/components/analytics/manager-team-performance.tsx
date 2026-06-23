'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Gauge, Timer, ShieldCheck, ShieldAlert, RotateCcw, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { ChartCard } from './chart-primitives';
import { BarH, BarV, Trend } from './chart-builders';
import { useTopNPages, ChartPager } from './chart-pager';
import { StatCard } from '../ui/stat-card';
import { DataTable, type DataTableColumn } from '../ui/data-table';
import { StatusPill, type PillTone } from '../ui/status-pill';
import { Progress } from '../ui/progress';
import { RadialGauge, type GaugeBand } from '../ui/radial-gauge';
import { Sparkline, type SparklineTone } from '../ui/sparkline';
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
const TOP_N = 8;

// Utilization band → semantic Progress fill / pill tone (the contract: <70 ok,
// 70–90 warn, >90 over). One mapping, reused for cells and KPI cards.
const BAND_FILL: Record<'ok' | 'warning' | 'over', string> = { ok: 'bg-info', warning: 'bg-warning', over: 'bg-critical' };
const BAND_TONE: Record<'ok' | 'warning' | 'over', PillTone> = { ok: 'brand', warning: 'warning', over: 'critical' };
const pctTone = (pct: number): PillTone => (pct >= 95 ? 'success' : pct >= 80 ? 'warning' : 'critical');
const slaColor = (pct: number) => (pct >= 95 ? SEMANTIC.success : pct >= 80 ? SEMANTIC.warning : SEMANTIC.danger);
// Gauge color bands for SLA adherence (red <80, amber <95, emerald ≥95).
const SLA_GAUGE_BANDS: GaugeBand[] = [
  { upTo: 79, color: SEMANTIC.danger },
  { upTo: 94, color: SEMANTIC.warning },
  { upTo: 100, color: SEMANTIC.success },
];
// Direction of a mini series → sparkline tone.
const trendTone = (s: number[]): SparklineTone => {
  if (!s || s.length < 2) return 'neutral';
  const half = Math.floor(s.length / 2);
  const a = s.slice(0, half).reduce((x, y) => x + y, 0);
  const b = s.slice(half).reduce((x, y) => x + y, 0);
  return b > a ? 'positive' : b < a ? 'negative' : 'neutral';
};

function businessDays(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0; const c = new Date(startMs); c.setHours(0, 0, 0, 0); const end = new Date(endMs);
  while (c <= end) { const d = c.getDay(); if (d !== 0 && d !== 6) n++; c.setDate(c.getDate() + 1); }
  return n;
}

type LeaderRow = ConsultantAgg & { utilization: number; closedTrend: number[] };

export function ManagerTeamPerformance({ tickets, loading, now }: Props) {
  const [reopenHistory, setReopenHistory] = useState<{ ticket_id: string; requested_at: string }[]>([]);

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
  const buckets = useMemo(() => buildBuckets(periodStart, periodEnd, autoGranularity(periodStart, periodEnd)), [periodStart, periodEnd]);

  // Per-consultant tickets-closed-per-bucket mini series (for the leaderboard Sparkline column).
  const closedTrendByName = useMemo(() => {
    const m = new Map<string, number[]>();
    agg.forEach(a => m.set(a.name, buckets.map(() => 0)));
    tickets.forEach(t => {
      if (!t.assignedConsultant || !isClosed(t)) return;
      const arr = m.get(t.assignedConsultant); if (!arr) return;
      const d = t.resolvedAt || t.closedAt; if (!d) return;
      const i = bucketIndex(buckets, new Date(d).getTime());
      if (i >= 0) arr[i]++;
    });
    return m;
  }, [agg, buckets, tickets]);

  // Leaderboard rows (DataTable sorts/paginates internally).
  const rows = useMemo<LeaderRow[]>(() => agg.map(a => ({ ...a, utilization: utilOf(a), closedTrend: closedTrendByName.get(a.name) || [] })), [agg, capacityHours, closedTrendByName]);

  // ── TEAM PERFORMANCE KPIs ──
  const teamKpis = useMemo(() => {
    const utils = agg.map(utilOf);
    const avgUtil = utils.length ? Math.round(utils.reduce((s, v) => s + v, 0) / utils.length) : 0;
    let resSum = 0, resN = 0;
    tickets.forEach(t => { const r = resolutionHours(t); if (r !== null) { resSum += r; resN++; } });
    const avgRes = resN ? Math.round((resSum / resN) * 10) / 10 : null;
    let slaTotal = 0, slaMet = 0;
    agg.forEach(a => { slaTotal += a.slaTotal; slaMet += a.slaMet; });
    const slaAdh = slaTotal ? Math.round((slaMet / slaTotal) * 100) : null;
    return { activeConsultants: agg.length, avgUtil, avgRes, slaAdh };
  }, [agg, tickets, capacityHours]);

  // ── Charts (no slice caps — every consultant renders; cards scale + scroll) ──
  const closedPer = useMemo(() => agg.map(a => ({ name: a.name, value: a.closed }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value), [agg]);

  const ftSplit = useMemo(() => agg.map(a => ({ name: a.name, Functional: Math.round(a.functional * 10) / 10, Technical: Math.round(a.technical * 10) / 10 }))
    .filter(d => d.Functional + d.Technical > 0).sort((a, b) => (b.Functional + b.Technical) - (a.Functional + a.Technical)), [agg]);

  const slaByConsultant = useMemo(() => agg.filter(a => a.slaAdherence !== null)
    .map(a => ({ name: a.name, value: a.slaAdherence as number }))
    .sort((a, b) => b.value - a.value), [agg]);

  // Clamp the F/T axis so the longest stacked bar doesn't bleed to the plot edge.
  const ftMax = useMemo(() => Math.max(1, ...ftSplit.map(d => d.Functional + d.Technical)), [ftSplit]);

  // Compact top-N paging for the three per-consultant highlight charts.
  const closedPg = useTopNPages(closedPer, TOP_N);
  const ftPg = useTopNPages(ftSplit, TOP_N);
  const slaPg = useTopNPages(slaByConsultant, TOP_N);

  const demandVsClosed = useMemo(() => {
    const r = buckets.map(b => ({ label: b.label, Created: 0, Closed: 0 }));
    tickets.forEach(t => {
      const ci = bucketIndex(buckets, new Date(t.createdAt).getTime());
      if (ci >= 0) r[ci].Created++;
      if (isClosed(t)) {
        const d = t.resolvedAt || t.closedAt;
        if (d) { const ri = bucketIndex(buckets, new Date(d).getTime()); if (ri >= 0) r[ri].Closed++; }
      }
    });
    return r;
  }, [buckets, tickets]);
  const demandEmpty = demandVsClosed.every(r => r.Created === 0 && r.Closed === 0);

  // Reopen rate (KPI) + trend
  const ticketIds = useMemo(() => new Set(tickets.map(t => t.id)), [tickets]);
  const reopenRate = useMemo(() => {
    if (tickets.length === 0) return 0;
    const reopened = tickets.filter(t => (t.reopenedCount || 0) > 0 || t.status === 'Reopened' || t.status === 'Reopen Requested').length;
    return Math.round((reopened / tickets.length) * 100);
  }, [tickets]);
  const reopenTrend = useMemo(() => {
    const r = buckets.map(b => ({ label: b.label, value: 0 }));
    reopenHistory.forEach(x => {
      if (!ticketIds.has(x.ticket_id)) return;
      const i = bucketIndex(buckets, new Date(x.requested_at).getTime());
      if (i >= 0) r[i].value++;
    });
    return r;
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
      (b.Critical + b.High + b.Medium + b.Low) - (a.Critical + a.High + a.Medium + a.Low));
  }, [tickets]);
  // Compact top-N modules + pagination (legend stays Critical→High→Medium→Low).
  const heatPg = useTopNPages(demandHeat, TOP_N);

  // SLA breach by priority — resolution SLA we DO track (within vs breached).
  const slaByPriority = useMemo(() => {
    const idx: Record<string, number> = Object.fromEntries(PRIORITIES.map((p, i) => [p, i]));
    const r = PRIORITIES.map(p => ({ priority: p, 'Within SLA': 0, Breached: 0 }));
    tickets.forEach(t => {
      if (!hasSlaTarget(t)) return;
      const i = idx[t.priority as string];
      if (i === undefined) return;
      if (slaBreached(t, now)) r[i].Breached++;
      else r[i]['Within SLA']++;
    });
    return r;
  }, [tickets, now]);
  const slaByPriorityEmpty = slaByPriority.every(r => r['Within SLA'] === 0 && r.Breached === 0);

  // ── DEMAND & QUALITY KPIs ──
  const quality = useMemo(() => {
    const total = tickets.length || 1;
    const escalated = tickets.filter(t => t.escalationFlag).length;
    const closed = tickets.filter(isClosed);
    const onTime = closed.filter(t => hasSlaTarget(t) && !slaBreached(t, now));
    const closedWithSla = closed.filter(hasSlaTarget);
    return {
      escalationRate: Math.round((escalated / total) * 100),
      onTimeClosure: closedWithSla.length ? Math.round((onTime.length / closedWithSla.length) * 100) : null,
    };
  }, [tickets, now]);
  const slaBreachCount = useMemo(() => tickets.filter(t => slaBreached(t, now)).length, [tickets, now]);

  const utilBand = utilizationBand(teamKpis.avgUtil);

  // ── Leaderboard columns ──
  const columns = useMemo<DataTableColumn<LeaderRow>[]>(() => [
    {
      key: 'name', header: 'Consultant', sortValue: r => r.name,
      render: r => <span className="font-medium text-ink">{r.name}</span>,
    },
    {
      key: 'handled', header: 'Tickets Handled', align: 'right', sortValue: r => r.handled,
      render: r => <span className="type-num text-ink">{r.handled}</span>,
    },
    {
      key: 'avgRes', header: 'Avg Resolution', align: 'right', sortValue: r => r.avgResolutionH ?? -1,
      exportValue: r => r.avgResolutionH ?? 0,
      render: r => <span className="type-num">{r.avgResolutionH !== null ? `${r.avgResolutionH.toFixed(1)}h` : '—'}</span>,
    },
    {
      key: 'sla', header: 'SLA Adherence', align: 'right', sortValue: r => r.slaAdherence ?? -1,
      exportValue: r => r.slaAdherence ?? 0,
      render: r => r.slaAdherence !== null
        ? <StatusPill tone={pctTone(r.slaAdherence)}>{r.slaAdherence}%</StatusPill>
        : <span className="text-ink-muted">—</span>,
    },
    {
      key: 'logged', header: 'Logged Hours', align: 'right', sortValue: r => r.loggedHours,
      render: r => <span className="type-num text-ink">{r.loggedHours.toFixed(1)}</span>,
    },
    {
      key: 'trend', header: 'Closed Trend', width: '110px',
      render: r => <Sparkline data={r.closedTrend} tone={trendTone(r.closedTrend)} />,
    },
    {
      key: 'util', header: 'Utilization', width: '200px', sortValue: r => r.utilization,
      render: r => {
        const band = utilizationBand(r.utilization);
        return (
          <div className="flex items-center gap-2">
            <Progress value={r.utilization} indicatorClassName={BAND_FILL[band]} className="h-2 flex-1" />
            <span className="type-num w-10 shrink-0 text-right text-ink-secondary">{r.utilization}%</span>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-8">
      {/* ───────────────────────── TEAM PERFORMANCE ───────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">Team Performance</h3>
          <p className="type-meta text-ink-muted">Consultant throughput, utilization and SLA across the period.</p>
        </div>

        {/* Hero SLA gauge beside the KPI cards */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex shrink-0 items-center justify-center rounded-lg border border-line bg-surface p-4 shadow-card lg:w-56">
            <RadialGauge value={teamKpis.slaAdh} label="Team SLA Adherence" sublabel={`${teamKpis.activeConsultants} consultants`} bands={SLA_GAUGE_BANDS} loading={loading} />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Consultants" value={teamKpis.activeConsultants} icon={Users} tone="brand" loading={loading} />
            <StatCard label="Avg Utilization" value={`${teamKpis.avgUtil}%`} icon={Gauge} tone={BAND_TONE[utilBand]} progress={teamKpis.avgUtil} progressTone={BAND_TONE[utilBand]} sub={`≈${capacityHours}h capacity`} loading={loading} />
            <StatCard label="Avg Resolution Time" value={teamKpis.avgRes !== null ? `${teamKpis.avgRes}h` : '—'} icon={Timer} tone="info" loading={loading} />
            <StatCard label="Team SLA Adherence" value={teamKpis.slaAdh !== null ? `${teamKpis.slaAdh}%` : '—'} icon={ShieldCheck} tone={teamKpis.slaAdh !== null ? pctTone(teamKpis.slaAdh) : 'neutral'} progress={teamKpis.slaAdh ?? undefined} progressTone={teamKpis.slaAdh !== null ? pctTone(teamKpis.slaAdh) : 'neutral'} loading={loading} />
          </div>
        </div>

        {/* Full roster — every consultant, paginated; the charts are compact top-8 highlights. */}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={r => r.id}
          loading={loading}
          pageSize={10}
          exportName="consultant-leaderboard"
          emptyIcon={Users}
          emptyTitle="No consultant activity"
          emptyDescription="No tickets were handled by consultants in this period."
        />

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ChartCard
            title="Tickets Closed per Consultant"
            isEmpty={closedPer.length === 0}
            action={<ChartPager page={closedPg.page} pageCount={closedPg.pageCount} onPage={closedPg.setPage} />}
          >
            <BarH data={closedPg.pageRows} categoryKey="name" series={[{ key: 'value', name: 'Closed', color: CHART_COLORS[2] }]} hideAxis valueLabels />
          </ChartCard>

          <ChartCard
            title="Functional vs Technical Effort Split"
            isEmpty={ftSplit.length === 0}
            emptyHint="No approved closure effort logged yet"
            action={<ChartPager page={ftPg.page} pageCount={ftPg.pageCount} onPage={ftPg.setPage} />}
          >
            <BarH data={ftPg.pageRows} categoryKey="name" series={[{ key: 'Functional' }, { key: 'Technical' }]} unit="h" domainMax={Math.ceil(ftMax * 1.15)} legend />
          </ChartCard>

          <ChartCard
            title="SLA Adherence by Consultant"
            isEmpty={slaByConsultant.length === 0}
            className="lg:col-span-2"
            action={<ChartPager page={slaPg.page} pageCount={slaPg.pageCount} onPage={slaPg.setPage} />}
          >
            <BarH data={slaPg.pageRows} categoryKey="name" series={[{ key: 'value', name: 'SLA Adherence' }]} unit="%" domainMax={100} valueLabels colorFor={r => slaColor(r.value)} />
          </ChartCard>
        </div>
      </section>

      {/* ───────────────────────── DEMAND & QUALITY ───────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">Demand &amp; Quality</h3>
          <p className="type-meta text-ink-muted">Incoming demand, resolution flow and quality signals.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Escalation Rate" value={`${quality.escalationRate}%`} icon={ShieldAlert} tone={quality.escalationRate > 10 ? 'critical' : 'warning'} loading={loading} />
          <StatCard label="Reopen Rate" value={`${reopenRate}%`} icon={RotateCcw} tone={reopenRate > 10 ? 'critical' : 'warning'} loading={loading} />
          <StatCard label="On-Time Closure" value={quality.onTimeClosure !== null ? `${quality.onTimeClosure}%` : '—'} icon={CheckCircle2} tone={quality.onTimeClosure !== null ? pctTone(quality.onTimeClosure) : 'neutral'} progress={quality.onTimeClosure ?? undefined} progressTone={quality.onTimeClosure !== null ? pctTone(quality.onTimeClosure) : 'neutral'} loading={loading} />
          <StatCard label="SLA Breach Count" value={slaBreachCount} icon={AlertTriangle} tone={slaBreachCount > 0 ? 'critical' : 'success'} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Demand vs Closed" isEmpty={demandEmpty}>
            <Trend data={demandVsClosed} categoryKey="label" series={[{ key: 'Created' }, { key: 'Closed', color: SEMANTIC.success }]} legend />
          </ChartCard>

          <ChartCard
            title="Reopen Requests Trend"
            isEmpty={reopenTrendEmpty}
            emptyIcon={RotateCcw}
            emptyHint="No reopen requests in this period"
            action={<span className="type-status text-ink-muted">Reopen rate {reopenRate}%</span>}
          >
            <Trend data={reopenTrend} categoryKey="label" series={[{ key: 'value', name: 'Reopens', color: SEMANTIC.warning }]} />
          </ChartCard>

          <ChartCard title="SLA Breach by Priority" isEmpty={slaByPriorityEmpty} emptyHint="No SLA-tracked tickets in this period">
            <BarV data={slaByPriority} categoryKey="priority" series={[{ key: 'Within SLA', color: SEMANTIC.success }, { key: 'Breached', color: SEMANTIC.danger }]} legend />
          </ChartCard>

          <ChartCard
            title="Demand Heat — Module × Priority"
            isEmpty={demandHeat.length === 0}
            action={<ChartPager page={heatPg.page} pageCount={heatPg.pageCount} onPage={heatPg.setPage} />}
          >
            <BarH data={heatPg.pageRows} categoryKey="module" series={PRIORITIES.map(p => ({ key: p, color: PRIORITY_COLOR[p] }))} legend categoryWidth={90} />
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
