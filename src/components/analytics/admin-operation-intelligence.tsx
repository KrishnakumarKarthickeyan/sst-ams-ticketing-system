'use client';

import React, { useMemo, useState } from 'react';
import { truncateTick } from './chart-primitives';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ReferenceLine,
} from 'recharts';
import { Ticket as TicketIcon, Users, Building2, CheckCircle2, FolderOpen, ShieldAlert } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { ChartCard, ChartTooltip, KpiCard } from './chart-primitives';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import {
  CHART_COLORS, SEMANTIC, PRIORITY_COLOR, STATUS_COLOR,
} from '../../lib/chart-theme';
import {
  buildBuckets, bucketIndex, autoGranularity, type Granularity,
  isOpen, isClosed, statusGroup, hasSlaTarget, slaBreached, resolutionHours,
  approvedHours,
} from '../../lib/analytics/derive';

interface Props {
  tickets: Ticket[];          // period-filtered
  previousTickets: Ticket[];  // previous equal-length period (for KPI deltas)
  loading: boolean;
  now: number;
  periodStart: number;
  periodEnd: number;
}

const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const distinct = (arr: (string | undefined)[]) => new Set(arr.filter(Boolean) as string[]).size;

function businessDaysBetween(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0;
  const c = new Date(startMs); c.setHours(0, 0, 0, 0);
  const end = new Date(endMs);
  while (c <= end) {
    const d = c.getDay();
    if (d !== 0 && d !== 6) n++;
    c.setDate(c.getDate() + 1);
  }
  return n;
}

export function AdminOperationIntelligence({ tickets, previousTickets, loading, now, periodStart, periodEnd }: Props) {
  const [gran, setGran] = useState<Granularity>(() => autoGranularity(periodStart, periodEnd));

  // ── KPIs ──
  const kpi = useMemo(() => {
    const breach = (set: Ticket[]) => set.filter(t => slaBreached(t, now)).length;
    return {
      total: tickets.length, prevTotal: previousTickets.length,
      open: tickets.filter(isOpen).length, prevOpen: previousTickets.filter(isOpen).length,
      closed: tickets.filter(isClosed).length, prevClosed: previousTickets.filter(isClosed).length,
      breached: breach(tickets), prevBreached: breach(previousTickets),
      customers: distinct(tickets.map(t => t.organization)), prevCustomers: distinct(previousTickets.map(t => t.organization)),
      consultants: distinct(tickets.map(t => t.assignedConsultant)), prevConsultants: distinct(previousTickets.map(t => t.assignedConsultant)),
    };
  }, [tickets, previousTickets, now]);

  // ── Buckets for trend charts (driven by the toggle) ──
  const buckets = useMemo(() => buildBuckets(periodStart, periodEnd, gran), [periodStart, periodEnd, gran]);

  // 1 — Ticket volume trend
  const volume = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => { const i = bucketIndex(buckets, new Date(t.createdAt).getTime()); if (i >= 0) rows[i].value++; });
    return rows;
  }, [buckets, tickets]);
  const volumeEmpty = volume.every(r => r.value === 0);

  // 2 — Status donut
  const status = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const g = statusGroup(t.status, t.escalationFlag); m[g] = (m[g] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  // 3 — Priority
  const priority = useMemo(() => PRIORITY_ORDER
    .map(p => ({ name: p, value: tickets.filter(t => t.priority === p).length }))
    .filter(d => d.value > 0), [tickets]);

  // 4 — Module
  const modules = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { if (t.sapModule) m[t.sapModule] = (m[t.sapModule] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  // 5 — Customer org (top 10)
  const customers = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const o = t.organization || 'Unknown'; m[o] = (m[o] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [tickets]);

  // 6 — SLA compliance over time + current gauge
  const slaTrend = useMemo(() => {
    const totals = buckets.map(() => ({ total: 0, met: 0 }));
    tickets.forEach(t => {
      if (!hasSlaTarget(t)) return;
      const i = bucketIndex(buckets, new Date(t.createdAt).getTime());
      if (i < 0) return;
      totals[i].total++;
      if (!slaBreached(t, now)) totals[i].met++;
    });
    return buckets.map((b, i) => ({ label: b.label, value: totals[i].total > 0 ? Math.round((totals[i].met / totals[i].total) * 100) : null }));
  }, [buckets, tickets, now]);
  const slaTrendEmpty = slaTrend.every(r => r.value === null);
  const slaOverall = useMemo(() => {
    const incidents = tickets.filter(hasSlaTarget);
    if (incidents.length === 0) return null;
    const met = incidents.filter(t => !slaBreached(t, now)).length;
    return Math.round((met / incidents.length) * 100);
  }, [tickets, now]);

  // 7 — Escalations trend + KPI
  const escTrend = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => { if (!t.escalationFlag) return; const i = bucketIndex(buckets, new Date(t.createdAt).getTime()); if (i >= 0) rows[i].value++; });
    return rows;
  }, [buckets, tickets]);
  const escTotal = useMemo(() => tickets.filter(t => t.escalationFlag).length, [tickets]);
  const escEmpty = escTrend.every(r => r.value === 0);

  // 8 — Avg resolution by priority
  const resolution = useMemo(() => PRIORITY_ORDER.map(p => {
    const hrs = tickets.filter(t => t.priority === p).map(resolutionHours).filter((h): h is number => h !== null);
    return { name: p, value: hrs.length ? Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10 : 0 };
  }).filter(d => d.value > 0), [tickets]);

  // 9 — Open vs Closed cumulative (stacked: open + closed = cumulative created)
  const cumulative = useMemo(() => {
    let createdCum = 0, closedCum = 0;
    return buckets.map(b => {
      createdCum += tickets.filter(t => { const ms = new Date(t.createdAt).getTime(); return ms >= b.from && ms <= b.to; }).length;
      closedCum += tickets.filter(t => {
        if (!isClosed(t)) return false;
        const r = t.resolvedAt || t.closedAt; if (!r) return false;
        const ms = new Date(r).getTime(); return ms >= b.from && ms <= b.to;
      }).length;
      return { label: b.label, Closed: closedCum, Open: Math.max(0, createdCum - closedCum) };
    });
  }, [buckets, tickets]);
  const cumulativeEmpty = cumulative.every(r => r.Open === 0 && r.Closed === 0);

  // 10 — Consultant utilization (logged hours) + capacity reference line
  const capacityHours = useMemo(() => businessDaysBetween(periodStart, periodEnd) * 8, [periodStart, periodEnd]);
  const utilization = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const c = t.assignedConsultant; if (!c) return; m[c] = (m[c] || 0) + approvedHours(t); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [tickets]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Operation Intelligence</h2>

      {/* KPI ROW — 6 cards across two rows */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Tickets" value={kpi.total} previous={kpi.prevTotal} icon={TicketIcon} />
        <KpiCard label="Open" value={kpi.open} previous={kpi.prevOpen} icon={FolderOpen} />
        <KpiCard label="Closed (period)" value={kpi.closed} previous={kpi.prevClosed} icon={CheckCircle2} />
        <KpiCard label="SLA Breached" value={kpi.breached} previous={kpi.prevBreached} invertDelta icon={ShieldAlert} />
        <KpiCard label="Active Customers" value={kpi.customers} previous={kpi.prevCustomers} icon={Building2} />
        <KpiCard label="Active Consultants" value={kpi.consultants} previous={kpi.prevConsultants} icon={Users} />
      </div>

      {/* CHART GRID */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1 — Volume trend (hero) */}
        <ChartCard
          title="Ticket Volume Trend"
          className="lg:col-span-2"
          isEmpty={volumeEmpty}
          action={
            <ToggleGroup type="single" value={gran} onValueChange={(v) => v && setGran(v as Granularity)} className="h-7">
              <ToggleGroupItem value="day" className="h-7 px-2 text-xs">Day</ToggleGroupItem>
              <ToggleGroupItem value="week" className="h-7 px-2 text-xs">Week</ToggleGroupItem>
              <ToggleGroupItem value="month" className="h-7 px-2 text-xs">Month</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="adminVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="linear" dataKey="value" name="Tickets" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#adminVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2 — Status donut */}
        <ChartCard title="Tickets by Status" isEmpty={status.length === 0}>
          <div className="relative h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {status.map((s, i) => <Cell key={s.name} fill={STATUS_COLOR[s.name] ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 28 }}>
              <span className="text-2xl font-bold tabular-nums text-foreground">{tickets.length}</span>
              <span className="text-[11px] text-muted-foreground">Total</span>
            </div>
          </div>
        </ChartCard>

        {/* 3 — Priority */}
        <ChartCard title="Tickets by Priority" isEmpty={priority.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priority} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]} barSize={46}>
                {priority.map(p => <Cell key={p.name} fill={PRIORITY_COLOR[p.name]} />)}
                <LabelList dataKey="value" position="top" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4 — Module (horizontal) */}
        <ChartCard title="Tickets by SAP Module" isEmpty={modules.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modules} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Tickets" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5 — Customer org (horizontal, top 10) */}
        <ChartCard title="Tickets by Customer (Top 10)" isEmpty={customers.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customers} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Tickets" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6 — SLA compliance over time + gauge */}
        <ChartCard title="SLA Compliance Over Time" isEmpty={slaTrendEmpty && slaOverall === null}>
          <div className="grid h-full grid-cols-3 gap-2">
            <div className="col-span-2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={slaTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminSla" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SEMANTIC.success} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={SEMANTIC.success} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} width={32} unit="%" />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  <Area type="linear" dataKey="value" name="Compliance" connectNulls stroke={SEMANTIC.success} strokeWidth={2} fill="url(#adminSla)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="relative flex h-full items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={[{ value: slaOverall ?? 0 }]} innerRadius="62%" outerRadius="100%" startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" angleAxisId={0} cornerRadius={8} background fill={slaOverall !== null && slaOverall >= 95 ? SEMANTIC.success : slaOverall !== null && slaOverall >= 80 ? SEMANTIC.warning : SEMANTIC.danger} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tabular-nums">{slaOverall ?? '—'}%</span>
                <span className="text-[10px] text-muted-foreground">now</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* 7 — Escalations trend */}
        <ChartCard title="Escalations Trend" isEmpty={escEmpty} action={<span className="text-xs text-muted-foreground">{escTotal} total</span>}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={escTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="linear" dataKey="value" name="Escalations" stroke={SEMANTIC.danger} strokeWidth={2} dot={{ r: 3, fill: SEMANTIC.danger }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 8 — Avg resolution by priority */}
        <ChartCard title="Avg Resolution Time by Priority" isEmpty={resolution.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resolution} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={40} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Avg Resolution" radius={[4, 4, 0, 0]} barSize={46}>
                {resolution.map(r => <Cell key={r.name} fill={PRIORITY_COLOR[r.name]} />)}
                <LabelList dataKey="value" position="top" fontSize={11} formatter={(v) => `${v}h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 9 — Open vs Closed cumulative (stacked) */}
        <ChartCard title="Open vs Closed (Cumulative)" isEmpty={cumulativeEmpty}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulative} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Area type="linear" dataKey="Closed" stackId="1" stroke={SEMANTIC.success} fill={SEMANTIC.success} fillOpacity={0.45} />
              <Area type="linear" dataKey="Open" stackId="1" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.45} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 10 — Consultant utilization snapshot */}
        <ChartCard
          title="Consultant Utilization (Logged Hours)"
          className="lg:col-span-2"
          isEmpty={utilization.length === 0}
          action={<span className="text-xs text-muted-foreground">Capacity ≈ {capacityHours}h</span>}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilization} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} unit="h" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              {capacityHours > 0 && (
                <ReferenceLine x={capacityHours} stroke={SEMANTIC.danger} strokeDasharray="4 4" label={{ value: '100% capacity', fontSize: 10, fill: SEMANTIC.danger, position: 'top' }} />
              )}
              <Bar dataKey="value" name="Logged" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} formatter={(v) => `${v}h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
