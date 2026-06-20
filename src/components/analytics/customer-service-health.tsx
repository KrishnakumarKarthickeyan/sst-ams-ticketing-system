'use client';

import React, { useMemo } from 'react';
import { truncateTick } from '../../lib/analytics/chart-kit';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList, RadialBarChart, RadialBar, PolarAngleAxis, Legend, ReferenceLine,
} from 'recharts';
import { Activity, Layers, AlertTriangle, Gauge, FileText, ListChecks, Tags, FolderTree, Flame, Timer } from 'lucide-react';
import { ChartFrame } from './chart-frame';
import {
  CHART, PRIORITY_FILL, LIFECYCLE_FILL, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE, timeBuckets,
} from '../../lib/analytics/chart-kit';
import {
  typeMix, categoryBreakdown, businessImpactDist, slaByPriority, qualityStats,
} from '../../lib/analytics/breakdowns';
import type { Ticket } from '../../types/ticket';

interface Props {
  companyTickets: Ticket[];
  contractUsage?: { used: number; total: number } | null;
  /** Monthly allocated contract hours — the burn-rate reference line. */
  monthlyQuota?: number | null;
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';

// Map the full status taxonomy onto the four lifecycle stages the customer cares about.
function lifecycleOf(status: string): 'Open' | 'In Progress' | 'Resolved' | 'Closed' {
  if (status === 'Closed') return 'Closed';
  if (status === 'Resolved' || status === 'Request for Closure' || status === 'Awaiting Manager Approval') return 'Resolved';
  if (
    status.startsWith('In Progress') || status === 'Customer Action' || status === 'Raised to SAP' ||
    status === 'On Hold' || status.startsWith('Awaiting') || status === 'Waiting for Hours Approval'
  ) return 'In Progress';
  return 'Open';
}

export function CustomerServiceHealth({ companyTickets, contractUsage, monthlyQuota, loading, now }: Props) {
  // ── Tickets by real lifecycle stage (always render all four — honest zeros) ──
  const lifecycle = useMemo(() => {
    const order: ('Open' | 'In Progress' | 'Resolved' | 'Closed')[] = ['Open', 'In Progress', 'Resolved', 'Closed'];
    const counts: Record<string, number> = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
    companyTickets.forEach(t => { counts[lifecycleOf(t.status)]++; });
    return order.map(name => ({ name, value: counts[name] }));
  }, [companyTickets]);

  // ── My ticket trend (created vs resolved, actual range) ──
  const flow = useMemo(() => {
    if (companyTickets.length === 0) return [];
    const start = Math.min(...companyTickets.map(t => new Date(t.createdAt).getTime()));
    const latest = Math.max(now, ...companyTickets.map(t => new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()));
    const { buckets, index } = timeBuckets(start, latest);
    const rows = buckets.map(b => ({ label: b.label, created: 0, resolved: 0 }));
    companyTickets.forEach(t => {
      const ci = index(new Date(t.createdAt).getTime());
      if (ci >= 0) rows[ci].created++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = index(new Date(r).getTime());
        if (ri >= 0) rows[ri].resolved++;
      }
    });
    return rows;
  }, [companyTickets, now]);
  const flowReady = flow.length >= 2 && (hasTrendSignal(flow.map(d => ({ value: d.created })), 2) || hasTrendSignal(flow.map(d => ({ value: d.resolved })), 2));

  // ── Resolution time stat ──
  const resolution = useMemo(() => {
    const done = companyTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && (t.resolvedAt || t.closedAt));
    const avg = done.length > 0
      ? done.reduce((s, t) => s + (new Date(t.resolvedAt || t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600e3, 0) / done.length
      : null;
    return { avg, n: done.length };
  }, [companyTickets]);

  // ── Open by priority (present categories only) ──
  const priority = useMemo(() => {
    const open = companyTickets.filter(isOpen);
    return ['Critical', 'High', 'Medium', 'Low']
      .map(p => ({ name: p, value: open.filter(t => t.priority === p).length }))
      .filter(d => d.value > 0);
  }, [companyTickets]);

  // ── By module ──
  const modules = useMemo(() => {
    const map: Record<string, number> = {};
    companyTickets.forEach(t => { if (t.sapModule) map[t.sapModule] = (map[t.sapModule] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [companyTickets]);

  // Give each module ~28px so all labels fit (floor 180 keeps it aligned with neighbour cards).
  const moduleChartHeight = Math.max(180, modules.length * 28 + 24);

  // ── Quoted vs approved-consumed hours, per module (scope adherence) ──
  const hoursByModule = useMemo(() => {
    const map: Record<string, { name: string; quoted: number; consumed: number }> = {};
    companyTickets.forEach(t => {
      const m = t.sapModule;
      if (!m) return;
      if (!map[m]) map[m] = { name: m, quoted: 0, consumed: 0 };
      map[m].quoted += t.quotedHours || 0;
      map[m].consumed += (t.actualHoursLogs || [])
        .filter(a => a.approvalStatus?.toLowerCase() === 'approved')
        .reduce((s, a) => s + (a.actualHours || 0), 0);
    });
    return Object.values(map)
      .filter(d => d.quoted > 0 || d.consumed > 0)
      .sort((a, b) => (b.quoted + b.consumed) - (a.quoted + a.consumed));
  }, [companyTickets]);
  // Two bars per module → ~38px each so labels + both bars breathe.
  const hoursChartHeight = Math.max(180, hoursByModule.length * 38 + 28);

  // ── Monthly contract burn: approved hours consumed per month (last 12) vs the quota ──
  const monthlyBurn = useMemo(() => {
    const ref = new Date(now);
    const buckets: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      buckets.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, label: dt.toLocaleString('en-US', { month: 'short' }) });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const rows = buckets.map(b => ({ month: b.label, consumed: 0 }));
    companyTickets.forEach(t => {
      // Approval timestamp is authoritative; fall back to the ticket's resolution/creation
      // date for rows whose approved_at was never stamped (legacy/seed) — all real dates.
      const fallback = t.resolvedAt || t.closedAt || t.updatedAt || t.createdAt;
      (t.actualHoursLogs || []).forEach(a => {
        if (a.approvalStatus?.toLowerCase() !== 'approved') return;
        const when = a.approvedAt || a.createdAt || fallback;
        if (!when) return;
        const dt = new Date(when);
        const i = idx.get(`${dt.getFullYear()}-${dt.getMonth()}`);
        if (i != null) rows[i].consumed += a.actualHours || 0;
      });
    });
    return rows.map(r => ({ ...r, consumed: Math.round(r.consumed * 10) / 10 }));
  }, [companyTickets, now]);
  const burnReady = monthlyBurn.some(r => r.consumed > 0);

  const usagePct = contractUsage && contractUsage.total > 0
    ? Math.min(100, Math.round((contractUsage.used / contractUsage.total) * 100))
    : null;

  // ── Service-quality dimensions (all from mapped ticket fields) ──
  const tmix = useMemo(() => typeMix(companyTickets), [companyTickets]);
  const cats = useMemo(() => categoryBreakdown(companyTickets), [companyTickets]);
  const impact = useMemo(() => businessImpactDist(companyTickets), [companyTickets]);
  const slaTier = useMemo(() => slaByPriority(companyTickets, now), [companyTickets, now]);
  const quality = useMemo(() => qualityStats(companyTickets), [companyTickets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-section text-ink">Service Health</h2>
        <p className="type-meta text-ink-muted">Where your tickets stand and how your service is performing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lifecycle — the real stages, not a single-slice donut */}
        <ChartFrame title="Tickets by Stage" context="Current lifecycle status" icon={ListChecks} loading={loading} ready={companyTickets.length > 0} emptyHint="Your tickets will appear here once raised." height={220}>
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 320, height: 220 }}>
            <BarChart data={lifecycle} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} />
              <YAxis {...axisProps} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={34}>
                {lifecycle.map(b => <Cell key={b.name} fill={LIFECYCLE_FILL[b.name] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="top" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* My ticket trend */}
        <ChartFrame title="Activity Trend" context="Created vs resolved, by day" icon={Activity} loading={loading} ready={flowReady} emptyHint="Trends appear once there's activity across at least two days." height={220} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 480, height: 220 }}>
            <LineChart data={flow} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Line type={HONEST_LINE} dataKey="created" name="Created" stroke={CHART.brand} strokeWidth={2} dot={{ r: 3, fill: CHART.brand }} />
              <Line type={HONEST_LINE} dataKey="resolved" name="Resolved" stroke={CHART.success} strokeWidth={2} dot={{ r: 3, fill: CHART.success }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Resolution time */}
        <ChartFrame title="Resolution Time" context="Average time to resolve" icon={Gauge} loading={loading} ready height={180}>
          <div className="flex h-full flex-col justify-center">
            <div className="type-num text-4xl font-semibold tracking-tight text-ink">
              {resolution.avg === null ? '—' : `${resolution.avg.toFixed(1)}h`}
            </div>
            <div className="type-status mt-1 text-ink-muted">
              {resolution.avg === null ? 'No resolved tickets yet' : `Across ${resolution.n} resolved ticket${resolution.n === 1 ? '' : 's'}`}
            </div>
          </div>
        </ChartFrame>

        {/* Contract usage */}
        <ChartFrame title="Contract Usage" context="Approved hours consumed" icon={FileText} loading={loading} ready={usagePct !== null} emptyTitle="No active contract" emptyHint="Contract consumption appears once a contract is active." emptyIcon={FileText} height={180}>
          <div className="relative flex h-full items-center justify-center">
            <ResponsiveContainer width="100%" height={150} initialDimension={{ width: 240, height: 150 }}>
              <RadialBarChart
                data={[{ value: usagePct ?? 0 }]}
                innerRadius="72%"
                outerRadius="100%"
                startAngle={220}
                endAngle={-40}
                barSize={14}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: CHART.grid }}
                  fill={usagePct !== null && usagePct >= 90 ? CHART.critical : usagePct !== null && usagePct >= 75 ? CHART.warning : CHART.brand}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="type-num text-3xl font-semibold tracking-tight text-ink">
                {usagePct}<span className="text-xl text-ink-muted">%</span>
              </div>
              <div className="type-status mt-0.5 text-ink-muted">
                {contractUsage ? `${contractUsage.used.toFixed(0)}h / ${contractUsage.total.toFixed(0)}h` : ''}
              </div>
            </div>
          </div>
        </ChartFrame>

        {/* Open by priority */}
        <ChartFrame title="Open by Priority" context="Active tickets" icon={AlertTriangle} loading={loading} ready={priority.length > 0} emptyTitle="Nothing open" emptyHint="You have no open tickets right now." emptyIcon={AlertTriangle} height={180}>
          <ResponsiveContainer width="100%" height={180} initialDimension={{ width: 320, height: 180 }}>
            <BarChart data={priority} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {priority.map(p => <Cell key={p.name} fill={PRIORITY_FILL[p.name] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* By module — height scales with module count so every label renders (interval=0) */}
        <ChartFrame title="By Module" context="All my tickets per module" icon={Layers} loading={loading} ready={modules.length > 0} emptyHint="No tickets with a module yet." height={moduleChartHeight}>
          <ResponsiveContainer width="100%" height={moduleChartHeight} initialDimension={{ width: 320, height: moduleChartHeight }}>
            <BarChart data={modules} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Quoted vs consumed hours per module — scope adherence (fills the By Module row) */}
        <ChartFrame title="Hours: Quoted vs Consumed" context="Approved effort against what was quoted, by module" icon={Timer} loading={loading} ready={hoursByModule.length > 0} emptyHint="Quoted and consumed hours appear once effort is logged and approved." height={hoursChartHeight} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={hoursChartHeight} initialDimension={{ width: 480, height: hoursChartHeight }}>
            <BarChart data={hoursByModule} layout="vertical" margin={{ top: 0, right: 40, left: 4, bottom: 0 }} barGap={2}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: CHART.grid }} />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
              <Bar dataKey="quoted" name="Quoted" fill={CHART.axis} radius={[0, 4, 4, 0]} barSize={11}>
                <LabelList dataKey="quoted" position="right" className="type-num" fill={CHART.ink} fontSize={10} formatter={(v) => `${v}h`} />
              </Bar>
              <Bar dataKey="consumed" name="Consumed" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={11}>
                <LabelList dataKey="consumed" position="right" className="type-num" fill={CHART.ink} fontSize={10} formatter={(v) => `${v}h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Monthly contract burn — full width: consumed hours per month vs the monthly allowance */}
        <ChartFrame title="Monthly Contract Burn" context={monthlyQuota ? `Approved hours consumed per month vs your ${Math.round(monthlyQuota)}h monthly allowance` : 'Approved hours consumed per month'} icon={Flame} loading={loading} ready={burnReady} emptyHint="Monthly burn appears once approved effort is logged." height={220} className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 720, height: 220 }}>
            <BarChart data={monthlyBurn} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...axisProps} interval={0} />
              <YAxis {...axisProps} allowDecimals={false} width={40} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: CHART.grid }} />
              {monthlyQuota ? (
                <ReferenceLine
                  y={monthlyQuota}
                  stroke={CHART.critical}
                  strokeDasharray="5 4"
                  label={{ value: `Monthly quota ${Math.round(monthlyQuota)}h`, position: 'insideTopRight', fill: CHART.critical, fontSize: 11 }}
                />
              ) : null}
              <Bar dataKey="consumed" name="Consumed" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {monthlyBurn.map((r, i) => (
                  <Cell key={i} fill={monthlyQuota && r.consumed > monthlyQuota ? CHART.critical : monthlyQuota && r.consumed >= monthlyQuota * 0.8 ? CHART.warning : CHART.brand} />
                ))}
                <LabelList dataKey="consumed" position="top" className="type-num" fill={CHART.ink} fontSize={11} formatter={(v) => (v ? `${v}h` : '')} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      {/* ── SERVICE QUALITY — richer analytical layer, all live-data ── */}
      <div className="pt-2">
        <h2 className="type-section text-ink">Service Quality &amp; Demand</h2>
        <p className="type-meta text-ink-muted">The SLA you receive, what you raise, and how reliably it is resolved.</p>
      </div>

      {/* Quality stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">SLA Received</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">
            {slaTier.length ? `${Math.round(slaTier.reduce((s, d) => s + d.met, 0) / Math.max(1, slaTier.reduce((s, d) => s + d.met + d.breached, 0)) * 100)}%` : '—'}
          </div>
          <span className="type-status text-ink-muted">incidents met on time</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Avg Resolution</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{quality.avgResolution === null ? '—' : `${quality.avgResolution}h`}</div>
          <span className="type-status text-ink-muted">across {quality.resolved} resolved</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Reopen Rate</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{quality.reopenRate === null ? '—' : `${quality.reopenRate}%`}</div>
          <span className="type-status text-ink-muted">{quality.reopened} reopened</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Request Types</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{tmix.length}</div>
          <span className="type-status text-ink-muted">{tmix[0] ? `${tmix[0].name} leads` : 'no data yet'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartFrame title="SLA by Priority" context="Compliance per tier" icon={Gauge} loading={loading} ready={slaTier.length > 0} emptyHint="No incidents with a target yet." height={200}>
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={slaTier} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} />
              <YAxis {...axisProps} domain={[0, 100]} width={40} unit="%" />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} barSize={32}>
                {slaTier.map(d => <Cell key={d.name} fill={d.pct >= 95 ? CHART.success : d.pct >= 80 ? CHART.warning : CHART.critical} />)}
                <LabelList dataKey="pct" position="top" className="type-num" fill={CHART.ink} fontSize={11} formatter={(v) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Request Type Mix" context="Incidents vs requests vs changes" icon={Tags} loading={loading} ready={tmix.length > 0} emptyHint="No typed tickets yet." height={200} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 480, height: 200 }}>
            <BarChart data={tmix} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={110} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.info} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Issue Categories" context="What you're raising" icon={FolderTree} loading={loading} ready={cats.length > 0} emptyHint="No categorized tickets yet." height={200} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 480, height: 200 }}>
            <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={130} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Business Impact" context="Severity of what you raise" icon={Flame} loading={loading} ready={impact.length > 0} emptyHint="No impact data yet." height={200}>
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={impact} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} />
              <YAxis {...axisProps} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                {impact.map((d, i) => <Cell key={d.name} fill={[CHART.critical, CHART.warning, CHART.brand, CHART.axis][i] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="top" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  );
}
