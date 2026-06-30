'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Ticket as TicketIcon, Users, Building2, CheckCircle2, FolderOpen, ShieldAlert, Sparkles } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import {
  buildBuckets, bucketIndex, autoGranularity, type Granularity,
  isOpen, isClosed, statusGroup, hasSlaTarget, slaBreached, resolutionHours,
  approvedHours,
} from '../../lib/analytics/derive';
import { computePeriodCapacityHours } from '../../lib/analytics/capacity';
import { AdminCard, AdminStat, AdminGrid, AdminSegmented, AdminEmpty, AdminBarList, AdminGauge, AdminSparkline } from '../admin/ui/admin-kit';
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
const pctDelta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0));
const sevColor = (name: string) => SEVERITY[name as keyof typeof SEVERITY] ?? ADMIN.ink3;

/** Chart shell — admin card + (fixed-height plot | natural-height list) + empty state. */
function ChartBox({ title, desc, action, isEmpty, height = 200, full, list, children }: {
  title: string; desc?: string; action?: React.ReactNode; isEmpty?: boolean; height?: number; full?: boolean; list?: boolean; children: React.ReactNode;
}) {
  return (
    <AdminCard title={title} desc={desc} actions={action} className={full ? 'ak-col-full' : ''}>
      {isEmpty ? <AdminEmpty small title="No data in this period" sub="Adjust the period or filters to populate this view." />
        : list ? children
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

  // ── presentation-only derivations (no data change) ──
  const slaTone = slaOverall == null ? ADMIN.ink3 : slaOverall >= 95 ? ADMIN_SEMANTIC.success : slaOverall >= 80 ? ADMIN_SEMANTIC.warning : ADMIN_SEMANTIC.danger;
  const axis = { tick: { ...ADMIN_AXIS }, tickLine: false, axisLine: false } as const;
  const slaSpark = slaTrend.filter(r => r.value !== null).map(r => r.value as number);
  const statusData = status.map((s, i) => ({ name: s.name, value: s.value, color: ADMIN_CATEGORICAL[i % ADMIN_CATEGORICAL.length] }));
  const priorityData = priority.map(p => ({ name: p.name, value: p.value, color: sevColor(p.name) }));
  const resolutionData = resolution.map(r => ({ name: r.name, value: r.value, color: sevColor(r.name) }));
  const utilMax = Math.max(capacityHours || 0, ...utilization.map(u => u.value), 1);

  // ───────────────────────────────── render ─────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="ak-eyebrow"><Sparkles size={13} strokeWidth={2} /> Operation intelligence</div>

      {/* KPI ROW — deltas vs previous equal-length period */}
      <AdminGrid cols={3}>
        <AdminStat label="Total Tickets" value={kpi.total} delta={pctDelta(kpi.total, kpi.prevTotal)} icon={<TicketIcon size={15} strokeWidth={2} />} sub="vs. previous period" loading={loading} />
        <AdminStat label="Open" value={kpi.open} delta={pctDelta(kpi.open, kpi.prevOpen)} icon={<FolderOpen size={15} strokeWidth={2} />} sub="active backlog" loading={loading} />
        <AdminStat label="Closed (period)" value={kpi.closed} delta={pctDelta(kpi.closed, kpi.prevClosed)} icon={<CheckCircle2 size={15} strokeWidth={2} />} sub="resolved / closed" loading={loading} />
        <AdminStat label="SLA Breached" value={kpi.breached} delta={pctDelta(kpi.breached, kpi.prevBreached)} invertDelta tone={kpi.breached > 0 ? 'critical' : 'neutral'} icon={<ShieldAlert size={15} strokeWidth={2} />} sub="lower is better" loading={loading} />
        <AdminStat label="Active Customers" value={kpi.customers} delta={pctDelta(kpi.customers, kpi.prevCustomers)} icon={<Building2 size={15} strokeWidth={2} />} sub="orgs with activity" loading={loading} />
        <AdminStat label="Active Consultants" value={kpi.consultants} delta={pctDelta(kpi.consultants, kpi.prevConsultants)} icon={<Users size={15} strokeWidth={2} />} sub="contributing" loading={loading} />
      </AdminGrid>

      <div className="ak-chartgrid">
        {/* Volume trend (hero, full width, compact) */}
        <ChartBox title="Ticket Volume Trend" desc="Created tickets over the active window." full isEmpty={volumeEmpty} height={170}
          action={<AdminSegmented options={['day', 'week', 'month'] as const} value={gran} onChange={(v) => setGran(v)} ariaLabel="Granularity" />}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volume} margin={{ top: 6, right: 14, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="aoiVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ADMIN.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={ADMIN.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={28} />
              <YAxis {...axis} allowDecimals={false} width={30} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} cursor={{ stroke: ADMIN.line2 }} />
              <Area type="monotone" dataKey="value" name="Tickets" stroke={ADMIN.accent} strokeWidth={2} fill="url(#aoiVol)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Status — dense bar list */}
        <ChartBox title="Tickets by Status" desc="Current distribution." list isEmpty={statusData.length === 0}>
          <AdminBarList data={statusData} />
        </ChartBox>

        {/* Priority — bar list (severity ramp) */}
        <ChartBox title="Tickets by Priority" desc="Severity mix." list isEmpty={priorityData.length === 0}>
          <AdminBarList data={priorityData} />
        </ChartBox>

        {/* Module — bar list */}
        <ChartBox title="Tickets by SAP Module" desc="Where work concentrates." list isEmpty={modules.length === 0}>
          <AdminBarList data={modules} color={ADMIN_CATEGORICAL[1]} />
        </ChartBox>

        {/* Customer — bar list */}
        <ChartBox title="Tickets by Customer" desc="Top 10 by volume." list isEmpty={customers.length === 0}>
          <AdminBarList data={customers} color={ADMIN_CATEGORICAL[2]} />
        </ChartBox>

        {/* SLA compliance — gauge forward + sparkline */}
        <ChartBox title="SLA Compliance" desc="Met vs. target · business-hours engine." list isEmpty={slaOverall === null}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <AdminGauge score={slaOverall ?? 0} label="compliant now" suffix="%" size={128} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: ADMIN.ink2 }}>Overall compliance</div>
              <div className="ak-num" style={{ fontSize: 24, fontWeight: 680, color: slaTone, letterSpacing: '-0.02em', margin: '2px 0 10px' }}>{slaOverall ?? '—'}%</div>
              {slaTrendEmpty
                ? <div style={{ fontSize: 11.5, color: ADMIN.ink3, lineHeight: 1.5 }}>Trend populates as incidents are created &amp; closed in this window.</div>
                : <><AdminSparkline data={slaSpark} color={ADMIN_SEMANTIC.success} w={150} h={40} /><div style={{ fontSize: 11, color: ADMIN.ink3, marginTop: 4 }}>compliance trend</div></>}
            </div>
          </div>
        </ChartBox>

        {/* Avg resolution by priority — bar list */}
        <ChartBox title="Avg Resolution by Priority" desc="Mean hours to close." list isEmpty={resolutionData.length === 0}>
          <AdminBarList data={resolutionData} valueSuffix="h" />
        </ChartBox>

        {/* Escalations trend — compact line */}
        <ChartBox title="Escalations Trend" desc={`${escTotal} escalated this period.`} isEmpty={escEmpty} height={168}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={escTrend} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axis} allowDecimals={false} width={30} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} />
              <Line type="monotone" dataKey="value" name="Escalations" stroke={ADMIN_SEMANTIC.danger} strokeWidth={2} dot={{ r: 3, fill: ADMIN_SEMANTIC.danger }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Open vs Closed cumulative — compact area */}
        <ChartBox title="Open vs Closed (Cumulative)" desc="Backlog burn-down." isEmpty={cumulativeEmpty} height={168}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulative} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={ADMIN_GRID} vertical={false} />
              <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axis} allowDecimals={false} width={30} />
              <Tooltip contentStyle={ADMIN_TOOLTIP} />
              <Legend verticalAlign="bottom" height={22} wrapperStyle={{ fontSize: 11, color: ADMIN.ink2 }} />
              <Area type="monotone" dataKey="Closed" stackId="1" stroke={ADMIN_SEMANTIC.success} fill={ADMIN_SEMANTIC.success} fillOpacity={0.32} />
              <Area type="monotone" dataKey="Open" stackId="1" stroke={ADMIN.accent} fill={ADMIN.accent} fillOpacity={0.28} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Consultant utilization — full-width bar list vs capacity */}
        <ChartBox title="Consultant Utilization (Logged Hours)" desc={`Capacity ≈ ${capacityHours}h this period.`} full list isEmpty={utilization.length === 0}>
          <AdminBarList data={utilization} color={ADMIN.accent} valueSuffix="h" max={utilMax} />
        </ChartBox>
      </div>
    </div>
  );
}
