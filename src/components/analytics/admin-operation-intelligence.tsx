'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ReferenceLine,
} from 'recharts';
import { Ticket as TicketIcon, Users, Building2, CheckCircle2, FolderOpen, ShieldAlert, Sparkles } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import {
  buildBuckets, bucketIndex, autoGranularity, type Granularity,
  isOpen, isClosed, statusGroup, hasSlaTarget, slaBreached, resolutionHours,
  approvedHours,
} from '../../lib/analytics/derive';
import { computePeriodCapacityHours } from '../../lib/analytics/capacity';
import { AdminCard, AdminStat, AdminGrid, AdminSegmented, AdminEmpty } from '../admin/ui/admin-kit';
import { ADMIN, SEVERITY, ADMIN_CATEGORICAL, ADMIN_SEMANTIC, ADMIN_TOOLTIP, ADMIN_AXIS, ADMIN_GRID } from '../admin/ui/admin-theme';

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
const truncate = (v: unknown) => (typeof v === 'string' && v.length > 13 ? v.slice(0, 12) + '…' : (v as string));
const pctDelta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0));
const sevColor = (name: string) => SEVERITY[name as keyof typeof SEVERITY] ?? ADMIN.ink3;

/** Chart shell — admin card + fixed-height plot + graceful empty state. */
function ChartBox({ title, desc, action, isEmpty, height = 252, full, children }: {
  title: string; desc?: string; action?: React.ReactNode; isEmpty?: boolean; height?: number; full?: boolean; children: React.ReactNode;
}) {
  return (
    <AdminCard title={title} desc={desc} actions={action} className={full ? 'ak-col-full' : ''}>
      {isEmpty ? <AdminEmpty small title="No data in this period" sub="Adjust the period or filters to populate this view." />
        : <div className="ak-chartbox" style={{ height }}>{children}</div>}
    </AdminCard>
  );
}

export function AdminOperationIntelligence({ tickets, previousTickets, loading, now, periodStart, periodEnd }: Props) {
  const [gran, setGran] = useState<Granularity>(() => autoGranularity(periodStart, periodEnd));

  // ───────────────────────── data memos (UNCHANGED logic) ─────────────────────────
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

  const buckets = useMemo(() => buildBuckets(periodStart, periodEnd, gran), [periodStart, periodEnd, gran]);

  const volume = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => { const i = bucketIndex(buckets, new Date(t.createdAt).getTime()); if (i >= 0) rows[i].value++; });
    return rows;
  }, [buckets, tickets]);
  const volumeEmpty = volume.every(r => r.value === 0);

  const status = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const g = statusGroup(t.status, t.escalationFlag); m[g] = (m[g] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  const priority = useMemo(() => PRIORITY_ORDER
    .map(p => ({ name: p, value: tickets.filter(t => t.priority === p).length }))
    .filter(d => d.value > 0), [tickets]);

  const modules = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { if (t.sapModule) m[t.sapModule] = (m[t.sapModule] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  const customers = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const o = t.organization || 'Unknown'; m[o] = (m[o] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [tickets]);

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

  const escTrend = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => { if (!t.escalationFlag) return; const i = bucketIndex(buckets, new Date(t.createdAt).getTime()); if (i >= 0) rows[i].value++; });
    return rows;
  }, [buckets, tickets]);
  const escTotal = useMemo(() => tickets.filter(t => t.escalationFlag).length, [tickets]);
  const escEmpty = escTrend.every(r => r.value === 0);

  const resolution = useMemo(() => PRIORITY_ORDER.map(p => {
    const hrs = tickets.filter(t => t.priority === p).map(resolutionHours).filter((h): h is number => h !== null);
    return { name: p, value: hrs.length ? Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10 : 0 };
  }).filter(d => d.value > 0), [tickets]);

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

  const capacityHours = useMemo(() => computePeriodCapacityHours(periodStart, periodEnd), [periodStart, periodEnd]);
  const utilization = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach(t => { const c = t.assignedConsultant; if (!c) return; m[c] = (m[c] || 0) + approvedHours(t); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
      .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [tickets]);

  const slaTone = slaOverall == null ? ADMIN.ink3 : slaOverall >= 95 ? ADMIN_SEMANTIC.success : slaOverall >= 80 ? ADMIN_SEMANTIC.warning : ADMIN_SEMANTIC.danger;
  const axis = { tick: { ...ADMIN_AXIS }, tickLine: false, axisLine: false } as const;

  // ───────────────────────────────── render ─────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="ak-eyebrow"><Sparkles size={13} strokeWidth={2} /> Operation intelligence</div>

      {/* KPI ROW — deltas vs previous equal-length period */}
      <AdminGrid cols={3}>
        <AdminStat label="Total Tickets" value={kpi.total} delta={pctDelta(kpi.total, kpi.prevTotal)} icon={<TicketIcon size={15} strokeWidth={2} />} sub="this period vs. previous" loading={loading} />
        <AdminStat label="Open" value={kpi.open} delta={pctDelta(kpi.open, kpi.prevOpen)} icon={<FolderOpen size={15} strokeWidth={2} />} sub="active backlog" loading={loading} />
        <AdminStat label="Closed (period)" value={kpi.closed} delta={pctDelta(kpi.closed, kpi.prevClosed)} icon={<CheckCircle2 size={15} strokeWidth={2} />} sub="resolved / closed" loading={loading} />
        <AdminStat label="SLA Breached" value={kpi.breached} delta={pctDelta(kpi.breached, kpi.prevBreached)} invertDelta tone={kpi.breached > 0 ? 'critical' : 'neutral'} icon={<ShieldAlert size={15} strokeWidth={2} />} sub="lower is better" loading={loading} />
        <AdminStat label="Active Customers" value={kpi.customers} delta={pctDelta(kpi.customers, kpi.prevCustomers)} icon={<Building2 size={15} strokeWidth={2} />} sub="orgs with activity" loading={loading} />
        <AdminStat label="Active Consultants" value={kpi.consultants} delta={pctDelta(kpi.consultants, kpi.prevConsultants)} icon={<Users size={15} strokeWidth={2} />} sub="contributing this period" loading={loading} />
      </AdminGrid>

      {/* CHART GRID */}
      <div className="ak-chartgrid">
        {/* 1 — Volume trend (hero, full width) */}
        <ChartBox title="Ticket Volume Trend" desc="Created tickets over the active window." full isEmpty={volumeEmpty} height={260}
          action={<AdminSegmented options={['day', 'week', 'month'] as const} value={gran} onChange={(v) => setGran(v)} ariaLabel="Granularity" />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume} margin={{ top: 8, right: 14, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="aoiVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ADMIN.accent} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ADMIN.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axis} allowDecimals={false} width={34} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ stroke: ADMIN.line2 }} />
              <Area type="monotone" dataKey="value" name="Tickets" stroke={ADMIN.accent} strokeWidth={2} fill="url(#aoiVol)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 2 — Status donut */}
        <ChartBox title="Tickets by Status" isEmpty={status.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={status} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="none">
                {status.map((s, i) => <Cell key={s.name} fill={ADMIN_CATEGORICAL[i % ADMIN_CATEGORICAL.length]} />)}
              </Pie>
              <Tooltip contentStyle={ADMIN_TOOLTIP} />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11, color: ADMIN.ink2 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 28 }}>
            <span style={{ fontSize: 26, fontWeight: 680, color: ADMIN.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{tickets.length}</span>
            <span style={{ fontSize: 11, color: ADMIN.ink3 }}>Total</span>
          </div>
        </ChartBox>

        {/* 3 — Priority (severity ramp) */}
        <ChartBox title="Tickets by Priority" desc="Severity mix." isEmpty={priority.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priority} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} allowDecimals={false} width={34} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ fill: ADMIN.panel2 }} />
              <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]} barSize={44}>
                {priority.map(p => <Cell key={p.name} fill={sevColor(p.name)} />)}
                <LabelList dataKey="value" position="top" fontSize={11} fill={ADMIN.ink2} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 4 — Module (horizontal) */}
        <ChartBox title="Tickets by SAP Module" desc="Where work concentrates." isEmpty={modules.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modules} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ ...ADMIN_AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={66} interval={0} tickFormatter={truncate} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ fill: ADMIN.panel2 }} />
              <Bar dataKey="value" name="Tickets" fill={ADMIN_CATEGORICAL[1]} radius={[0, 6, 6, 0]} barSize={15}>
                <LabelList dataKey="value" position="right" fontSize={11} fill={ADMIN.ink2} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 5 — Customer (horizontal, top 10) */}
        <ChartBox title="Tickets by Customer" desc="Top 10 by volume." isEmpty={customers.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customers} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ ...ADMIN_AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={92} interval={0} tickFormatter={truncate} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ fill: ADMIN.panel2 }} />
              <Bar dataKey="value" name="Tickets" fill={ADMIN_CATEGORICAL[2]} radius={[0, 6, 6, 0]} barSize={15}>
                <LabelList dataKey="value" position="right" fontSize={11} fill={ADMIN.ink2} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 6 — SLA compliance over time + current gauge */}
        <ChartBox title="SLA Compliance Over Time" desc="Met vs. target, business-hours engine." isEmpty={slaTrendEmpty && slaOverall === null}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="aoiSla" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ADMIN_SEMANTIC.success} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={ADMIN_SEMANTIC.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
                <YAxis domain={[0, 100]} {...axis} width={30} unit="%" />
                <Tooltip contentStyle={ADMIN_TOOLTIP} formatter={(v) => [`${v}%`, 'Compliance']} />
                <Area type="monotone" dataKey="value" name="Compliance" connectNulls stroke={ADMIN_SEMANTIC.success} strokeWidth={2} fill="url(#aoiSla)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={[{ value: slaOverall ?? 0 }]} innerRadius="64%" outerRadius="100%" startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" angleAxisId={0} cornerRadius={9} background={{ fill: ADMIN.line2 }} fill={slaTone} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: ADMIN.ink, fontVariantNumeric: 'tabular-nums' }}>{slaOverall ?? '—'}%</span>
                <span style={{ fontSize: 10, color: ADMIN.ink3 }}>now</span>
              </div>
            </div>
          </div>
        </ChartBox>

        {/* 7 — Escalations trend */}
        <ChartBox title="Escalations Trend" desc={`${escTotal} escalated this period.`} isEmpty={escEmpty}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={escTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axis} allowDecimals={false} width={34} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} />
              <Line type="monotone" dataKey="value" name="Escalations" stroke={ADMIN_SEMANTIC.danger} strokeWidth={2} dot={{ r: 3, fill: ADMIN_SEMANTIC.danger }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 8 — Avg resolution by priority (severity) */}
        <ChartBox title="Avg Resolution by Priority" desc="Mean hours to close." isEmpty={resolution.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resolution} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} width={40} unit="h" />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ fill: ADMIN.panel2 }} formatter={(v) => [`${v}h`, 'Avg']} />
              <Bar dataKey="value" name="Avg Resolution" radius={[6, 6, 0, 0]} barSize={44}>
                {resolution.map(r => <Cell key={r.name} fill={sevColor(r.name)} />)}
                <LabelList dataKey="value" position="top" fontSize={11} fill={ADMIN.ink2} formatter={(v) => `h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 9 — Open vs Closed cumulative */}
        <ChartBox title="Open vs Closed (Cumulative)" desc="Backlog burn-down." isEmpty={cumulativeEmpty}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulative} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={20} />
              <YAxis {...axis} allowDecimals={false} width={34} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} />
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 11, color: ADMIN.ink2 }} />
              <Area type="monotone" dataKey="Closed" stackId="1" stroke={ADMIN_SEMANTIC.success} fill={ADMIN_SEMANTIC.success} fillOpacity={0.35} />
              <Area type="monotone" dataKey="Open" stackId="1" stroke={ADMIN.accent} fill={ADMIN.accent} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* 10 — Consultant utilization (full width) */}
        <ChartBox title="Consultant Utilization (Logged Hours)" desc={`Capacity ≈ ${capacityHours}h this period (100% marker).`} full isEmpty={utilization.length === 0} height={Math.max(220, utilization.length * 34 + 40)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilization} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
              <XAxis type="number" {...axis} allowDecimals={false} unit="h" />
              <YAxis type="category" dataKey="name" tick={{ ...ADMIN_AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={120} interval={0} tickFormatter={truncate} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ fill: ADMIN.panel2 }} formatter={(v) => [`${v}h`, 'Logged']} />
              {capacityHours > 0 && (
                <ReferenceLine x={capacityHours} stroke={ADMIN_SEMANTIC.danger} strokeDasharray="4 4" label={{ value: '100% capacity', fontSize: 10, fill: ADMIN_SEMANTIC.danger, position: 'top' }} />
              )}
              <Bar dataKey="value" name="Logged" fill={ADMIN.accent} radius={[0, 6, 6, 0]} barSize={15}>
                <LabelList dataKey="value" position="right" fontSize={11} fill={ADMIN.ink2} formatter={(v) => `h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
}
