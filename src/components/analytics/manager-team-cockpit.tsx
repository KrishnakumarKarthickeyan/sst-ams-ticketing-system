'use client';

import React, { useMemo } from 'react';
import { truncateTick } from '../../lib/analytics/chart-kit';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList, Brush,
} from 'recharts';
import { Activity, Layers, Users, CheckSquare, Hourglass, Tags, FolderTree, Flame, Gauge, Timer } from 'lucide-react';
import { ChartFrame } from './chart-frame';
import {
  CHART, PRIORITY_FILL, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE, timeBuckets,
} from '../../lib/analytics/chart-kit';
import {
  typeMix, categoryBreakdown, businessImpactDist, slaByPriority, resolutionByPriority, qualityStats,
} from '../../lib/analytics/breakdowns';
import type { Ticket } from '../../types/ticket';

interface Props {
  tickets: Ticket[];
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';
const ageDays = (iso: string, now: number) => (now - new Date(iso).getTime()) / 86400e3;

const CAPACITY_TOP_N = 10;

export function ManagerTeamCockpit({ tickets, loading, now }: Props) {
  // ── Backlog aging buckets ──
  const aging = useMemo(() => {
    const open = tickets.filter(isOpen);
    const buckets = [
      { name: '0–1d', value: 0, tone: CHART.success },
      { name: '1–3d', value: 0, tone: CHART.brand },
      { name: '3–7d', value: 0, tone: CHART.warning },
      { name: '7d+', value: 0, tone: CHART.critical },
    ];
    open.forEach(t => {
      const a = ageDays(t.createdAt, now);
      if (a < 1) buckets[0].value++;
      else if (a < 3) buckets[1].value++;
      else if (a < 7) buckets[2].value++;
      else buckets[3].value++;
    });
    return buckets;
  }, [tickets, now]);
  const agingReady = aging.some(b => b.value > 0);

  // ── Throughput: opened vs resolved over the actual range, adaptively bucketed ──
  const flow = useMemo(() => {
    if (tickets.length === 0) return [];
    const start = Math.min(...tickets.map(t => new Date(t.createdAt).getTime()));
    const latest = Math.max(now, ...tickets.map(t => new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()));
    const { buckets, index } = timeBuckets(start, latest);
    const rows = buckets.map(b => ({ label: b.label, opened: 0, resolved: 0 }));
    tickets.forEach(t => {
      const ci = index(new Date(t.createdAt).getTime());
      if (ci >= 0) rows[ci].opened++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = index(new Date(r).getTime());
        if (ri >= 0) rows[ri].resolved++;
      }
    });
    return rows;
  }, [tickets, now]);
  const flowReady = flow.length >= 2 && (hasTrendSignal(flow.map(d => ({ value: d.opened })), 2) || hasTrendSignal(flow.map(d => ({ value: d.resolved })), 2));

  // ── Capacity balance per consultant (degrades to a list) ──
  const capacity = useMemo(() => {
    const open = tickets.filter(isOpen);
    const byName: Record<string, number> = {};
    open.forEach(t => { const n = t.assignedConsultant || 'Unassigned'; byName[n] = (byName[n] || 0) + 1; });
    const rows = Object.entries(byName).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const visible = rows.slice(0, CAPACITY_TOP_N);
    return { rows, realConsultants: rows.filter(r => r.name !== 'Unassigned'), visible, hidden: rows.length - visible.length };
  }, [tickets]);

  // ── Approval bottlenecks by type ──
  const approvals = useMemo(() => {
    let closures = 0, timesheets = 0, reopens = 0, unlocks = 0;
    tickets.forEach(t => {
      closures += (t.closureRequests || []).filter(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending').length;
      timesheets += (t.actualHoursLogs || []).filter(h => h.approvalStatus?.toLowerCase() === 'pending').length;
      unlocks += (t.unlockRequests || []).filter(u => u.status === 'Pending').length;
      if (t.status === 'Reopen Requested') reopens += 1;
    });
    const rows = [
      { name: 'Closures', value: closures },
      { name: 'Timesheets', value: timesheets },
      { name: 'Reopens', value: reopens },
      { name: 'Unlocks', value: unlocks },
    ].filter(r => r.value > 0);
    return { rows, total: closures + timesheets + reopens + unlocks };
  }, [tickets]);

  // ── Per-consultant performance table ──
  const performance = useMemo(() => {
    const map: Record<string, { name: string; open: number; closed: number; incidents: number; breached: number }> = {};
    tickets.forEach(t => {
      const n = t.assignedConsultant;
      if (!n) return;
      if (!map[n]) map[n] = { name: n, open: 0, closed: 0, incidents: 0, breached: 0 };
      if (isOpen(t)) map[n].open++; else map[n].closed++;
      if ((t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
        map[n].incidents++;
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed' ? new Date(t.resolvedAt || t.closedAt || now).getTime() : now;
        if (end > due) map[n].breached++;
      }
    });
    return Object.values(map).map(r => ({ ...r, sla: r.incidents > 0 ? Math.round(((r.incidents - r.breached) / r.incidents) * 100) : null })).sort((a, b) => b.open - a.open);
  }, [tickets, now]);

  // ── Demand & quality dimensions (all from mapped ticket fields) ──
  const tmix = useMemo(() => typeMix(tickets), [tickets]);
  const cats = useMemo(() => categoryBreakdown(tickets), [tickets]);
  const impact = useMemo(() => businessImpactDist(tickets), [tickets]);
  const slaTier = useMemo(() => slaByPriority(tickets, now), [tickets, now]);
  const resByPrio = useMemo(() => resolutionByPriority(tickets), [tickets]);
  const quality = useMemo(() => qualityStats(tickets), [tickets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-section text-ink">Team Performance</h2>
        <p className="type-meta text-ink-muted">Backlog health, throughput and where your attention is needed.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartFrame title="Backlog Aging" context="Open tickets by age" icon={Hourglass} loading={loading} ready={agingReady} emptyHint="No open backlog right now." height={280}>
          <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 320, height: 280 }}>
            <BarChart data={aging} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                {aging.map(b => <Cell key={b.name} fill={b.tone} />)}
                <LabelList dataKey="value" position="top" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Throughput" context="Opened vs resolved · drag the slider to zoom the range" icon={Activity} loading={loading} ready={flowReady} emptyHint="Trends appear once there are at least two active days." height={280} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 480, height: 280 }}>
            <LineChart data={flow} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Line type={HONEST_LINE} dataKey="opened" name="Opened" stroke={CHART.brand} strokeWidth={2} dot={{ r: 3, fill: CHART.brand }} />
              <Line type={HONEST_LINE} dataKey="resolved" name="Resolved" stroke={CHART.success} strokeWidth={2} dot={{ r: 3, fill: CHART.success }} />
              {/* Range slider — scrubs/zooms the timeline; defaults to the most recent window when there are many points */}
              <Brush
                dataKey="label"
                height={24}
                travellerWidth={8}
                stroke={CHART.brand}
                fill="hsl(var(--muted))"
                tickFormatter={() => ''}
                startIndex={Math.max(0, flow.length - 16)}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Capacity Balance" context={`${capacity.realConsultants.length} with open load · scroll for all`} icon={Users} loading={loading} ready={capacity.rows.length > 0} emptyHint="No assigned open tickets yet." height={280}>
          {capacity.realConsultants.length >= 2 ? (
            // Scroll container fills the fixed card body; the chart is sized to ALL
            // rows (26px each), so every consultant shows and the list scrolls —
            // no Top-N cap, no overflow, at any team size.
            <div className="h-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(160, capacity.rows.length * 26)} initialDimension={{ width: 320, height: 240 }}>
                <BarChart data={capacity.rows} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={96} interval={0} tickFormatter={truncateTick} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                    {capacity.rows.map(r => <Cell key={r.name} fill={r.name === 'Unassigned' ? CHART.axis : CHART.info} />)}
                    <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center gap-2">
              {capacity.rows.map(r => (
                <div key={r.name} className="flex items-center justify-between rounded-md border border-line bg-surface-muted/50 px-3 py-2">
                  <span className="type-meta truncate text-ink">{r.name}</span>
                  <span className="type-num type-meta font-semibold text-ink">{r.value} open</span>
                </div>
              ))}
              <p className="type-status mt-1 text-ink-muted">Balance chart unlocks with a second active consultant.</p>
            </div>
          )}
        </ChartFrame>

        <ChartFrame title="Approval Bottlenecks" context={`${approvals.total} awaiting you`} icon={CheckSquare} loading={loading} ready={approvals.rows.length > 0} emptyTitle="Queue is clear" emptyHint="No approvals are waiting on you." emptyIcon={CheckSquare} height={280}>
          <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 320, height: 280 }}>
            <BarChart data={approvals.rows} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={78} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.warning} radius={[0, 4, 4, 0]} barSize={20}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Consultant Performance" context={`${performance.length} consultant${performance.length === 1 ? '' : 's'} · open · closed · SLA`} icon={Layers} loading={loading} ready={performance.length > 0} emptyHint="No consultant activity yet." height={280} bodyClassName="!min-h-0">
          {/* h-full so the table scrolls INSIDE the fixed card body (all rows, no spill) */}
          <div className="h-full overflow-y-auto rounded-md border border-line">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-line bg-surface-muted">
                  <th className="type-status px-3 py-2 text-left font-semibold tracking-wider text-ink-muted uppercase">Consultant</th>
                  <th className="type-status px-2 py-2 text-right font-semibold tracking-wider text-ink-muted uppercase">Open</th>
                  <th className="type-status px-2 py-2 text-right font-semibold tracking-wider text-ink-muted uppercase">Closed</th>
                  <th className="type-status px-3 py-2 text-right font-semibold tracking-wider text-ink-muted uppercase">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {performance.map(r => (
                  <tr key={r.name}>
                    <td className="type-meta truncate px-3 py-2 text-ink">{r.name}</td>
                    <td className="type-meta type-num px-2 py-2 text-right text-ink">{r.open}</td>
                    <td className="type-meta type-num px-2 py-2 text-right text-ink-secondary">{r.closed}</td>
                    <td className={`type-meta type-num px-3 py-2 text-right font-semibold ${r.sla === null ? 'text-ink-muted' : r.sla >= 95 ? 'text-success' : r.sla >= 80 ? 'text-warning' : 'text-critical'}`}>
                      {r.sla === null ? '—' : `${r.sla}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>

      {/* ── DEMAND & QUALITY — richer analytical layer, all live-data ── */}
      <div className="pt-2">
        <h2 className="type-section text-ink">Demand &amp; Quality</h2>
        <p className="type-meta text-ink-muted">What the team is handling, and how well.</p>
      </div>

      {/* Quality stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Reopen Rate</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{quality.reopenRate === null ? '—' : `${quality.reopenRate}%`}</div>
          <span className="type-status text-ink-muted">{quality.reopened} reopened of {tickets.length}</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Avg Resolution</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{quality.avgResolution === null ? '—' : `${quality.avgResolution}h`}</div>
          <span className="type-status text-ink-muted">across {quality.resolved} resolved</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Ticket Types</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{tmix.length}</div>
          <span className="type-status text-ink-muted">{tmix[0] ? `${tmix[0].name} leads` : 'no data yet'}</span>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <span className="type-status text-ink-muted uppercase tracking-wider">Issue Categories</span>
          <div className="type-num mt-1 text-2xl font-semibold text-ink">{cats.length}</div>
          <span className="type-status text-ink-muted">{cats[0] ? `${cats[0].name}` : 'no data yet'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartFrame title="Ticket Type Mix" context="Incidents vs requests vs changes" icon={Tags} loading={loading} ready={tmix.length > 0} emptyHint="No typed tickets yet." height={200}>
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={tmix} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={96} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.info} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Issue Categories" context="What kinds of problems" icon={FolderTree} loading={loading} ready={cats.length > 0} emptyHint="No categorized tickets yet." height={200} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 480, height: 200 }}>
            <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={130} interval={0} tickFormatter={truncateTick} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Business Impact" context="Severity distribution" icon={Flame} loading={loading} ready={impact.length > 0} emptyHint="No impact data yet." height={200}>
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

        <ChartFrame title="Resolution Time by Priority" context="Average hours to resolve" icon={Timer} loading={loading} ready={resByPrio.length > 0} emptyHint="No resolved tickets yet." height={200} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 480, height: 200 }}>
            <BarChart data={resByPrio} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} />
              <YAxis {...axisProps} width={36} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {resByPrio.map(d => <Cell key={d.name} fill={PRIORITY_FILL[d.name] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="top" className="type-num" fill={CHART.ink} fontSize={11} formatter={(v) => `${v}h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  );
}
