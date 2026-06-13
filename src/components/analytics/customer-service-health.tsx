'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { Activity, Layers, AlertTriangle, Gauge, FileText, ListChecks } from 'lucide-react';
import { ChartFrame } from './chart-frame';
import {
  CHART, PRIORITY_FILL, LIFECYCLE_FILL, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE,
} from '../../lib/analytics/chart-kit';
import type { Ticket } from '../../types/ticket';

interface Props {
  companyTickets: Ticket[];
  contractUsage?: { used: number; total: number } | null;
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

export function CustomerServiceHealth({ companyTickets, contractUsage, loading, now }: Props) {
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
    const days: { key: string; label: string; created: number; resolved: number }[] = [];
    const cursor = new Date(start); cursor.setHours(0, 0, 0, 0);
    const end = new Date(latest);
    while (cursor <= end && days.length < 92) {
      days.push({ key: cursor.toISOString().slice(0, 10), label: dayLabel(cursor.toISOString()), created: 0, resolved: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    companyTickets.forEach(t => {
      const ci = idx[dayKey(t.createdAt)];
      if (ci !== undefined) days[ci].created++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = idx[dayKey(r)];
        if (ri !== undefined) days[ri].resolved++;
      }
    });
    return days;
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

  const usagePct = contractUsage && contractUsage.total > 0
    ? Math.min(100, Math.round((contractUsage.used / contractUsage.total) * 100))
    : null;

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
            <BarChart data={lifecycle} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} interval={0} />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
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
            <LineChart data={flow} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
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
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="type-num text-4xl font-semibold tracking-tight text-ink">{usagePct}<span className="text-2xl text-ink-muted">%</span></span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
              <div
                className={`h-full rounded-full ${usagePct !== null && usagePct >= 90 ? 'bg-critical' : usagePct !== null && usagePct >= 75 ? 'bg-warning' : 'bg-brand'}`}
                style={{ width: `${usagePct ?? 0}%` }}
              />
            </div>
            <div className="type-status mt-2 text-ink-muted">
              {contractUsage ? `${contractUsage.used.toFixed(1)}h of ${contractUsage.total.toFixed(1)}h` : ''}
            </div>
          </div>
        </ChartFrame>

        {/* Open by priority */}
        <ChartFrame title="Open by Priority" context="Active tickets" icon={AlertTriangle} loading={loading} ready={priority.length > 0} emptyTitle="Nothing open" emptyHint="You have no open tickets right now." emptyIcon={AlertTriangle} height={180}>
          <ResponsiveContainer width="100%" height={180} initialDimension={{ width: 320, height: 180 }}>
            <BarChart data={priority} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {priority.map(p => <Cell key={p.name} fill={PRIORITY_FILL[p.name] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* By module */}
        <ChartFrame title="By Module" context="All my tickets per module" icon={Layers} loading={loading} ready={modules.length > 0} emptyHint="No tickets with a module yet." height={180}>
          <ResponsiveContainer width="100%" height={180} initialDimension={{ width: 320, height: 180 }}>
            <BarChart data={modules} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  );
}
