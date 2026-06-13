'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { Activity, Layers, Users, CheckSquare, Hourglass } from 'lucide-react';
import { ChartFrame } from './chart-frame';
import {
  CHART, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE,
} from '../../lib/analytics/chart-kit';
import type { Ticket } from '../../types/ticket';

interface Props {
  tickets: Ticket[];
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const ageDays = (iso: string, now: number) => (now - new Date(iso).getTime()) / 86400e3;

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

  // ── Throughput: opened vs resolved over the actual range ──
  const flow = useMemo(() => {
    if (tickets.length === 0) return [];
    const start = Math.min(...tickets.map(t => new Date(t.createdAt).getTime()));
    const latest = Math.max(now, ...tickets.map(t => new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()));
    const days: { key: string; label: string; opened: number; resolved: number }[] = [];
    const cursor = new Date(start); cursor.setHours(0, 0, 0, 0);
    const end = new Date(latest);
    while (cursor <= end && days.length < 92) {
      days.push({ key: cursor.toISOString().slice(0, 10), label: dayLabel(cursor.toISOString()), opened: 0, resolved: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    tickets.forEach(t => {
      const ci = idx[dayKey(t.createdAt)];
      if (ci !== undefined) days[ci].opened++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = idx[dayKey(r)];
        if (ri !== undefined) days[ri].resolved++;
      }
    });
    return days;
  }, [tickets, now]);
  const flowReady = flow.length >= 2 && (hasTrendSignal(flow.map(d => ({ value: d.opened })), 2) || hasTrendSignal(flow.map(d => ({ value: d.resolved })), 2));

  // ── Capacity balance per consultant (degrades to a list) ──
  const capacity = useMemo(() => {
    const open = tickets.filter(isOpen);
    const byName: Record<string, number> = {};
    open.forEach(t => { const n = t.assignedConsultant || 'Unassigned'; byName[n] = (byName[n] || 0) + 1; });
    const rows = Object.entries(byName).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { rows, realConsultants: rows.filter(r => r.name !== 'Unassigned') };
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-section text-ink">Team Performance</h2>
        <p className="type-meta text-ink-muted">Backlog health, throughput and where your attention is needed.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartFrame title="Backlog Aging" context="Open tickets by age" icon={Hourglass} loading={loading} ready={agingReady} emptyHint="No open backlog right now." height={220}>
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 320, height: 220 }}>
            <BarChart data={aging} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                {aging.map(b => <Cell key={b.name} fill={b.tone} />)}
                <LabelList dataKey="value" position="top" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Throughput" context="Opened vs resolved, by day" icon={Activity} loading={loading} ready={flowReady} emptyHint="Trends appear once there are at least two active days." height={220} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 480, height: 220 }}>
            <LineChart data={flow} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Line type={HONEST_LINE} dataKey="opened" name="Opened" stroke={CHART.brand} strokeWidth={2} dot={{ r: 3, fill: CHART.brand }} />
              <Line type={HONEST_LINE} dataKey="resolved" name="Resolved" stroke={CHART.success} strokeWidth={2} dot={{ r: 3, fill: CHART.success }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Capacity Balance" context="Open load per consultant" icon={Users} loading={loading} ready={capacity.rows.length > 0} emptyHint="No assigned open tickets yet." height={200}>
          {capacity.realConsultants.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
              <BarChart data={capacity.rows} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={88} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {capacity.rows.map(r => <Cell key={r.name} fill={r.name === 'Unassigned' ? CHART.axis : CHART.info} />)}
                  <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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

        <ChartFrame title="Approval Bottlenecks" context={`${approvals.total} awaiting you`} icon={CheckSquare} loading={loading} ready={approvals.rows.length > 0} emptyTitle="Queue is clear" emptyHint="No approvals are waiting on you." emptyIcon={CheckSquare} height={200}>
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={approvals.rows} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={78} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.warning} radius={[0, 4, 4, 0]} barSize={20}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Consultant Performance" context="Open · closed · SLA met" icon={Layers} loading={loading} ready={performance.length > 0} emptyHint="No consultant activity yet." height={200} bodyClassName="!min-h-0">
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full">
              <thead>
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
    </div>
  );
}
