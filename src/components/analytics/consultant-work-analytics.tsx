'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from 'recharts';
import { Activity, Timer, Layers, Gauge, AlertTriangle, Clock } from 'lucide-react';
import { ChartFrame } from './chart-frame';
import {
  CHART, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE,
} from '../../lib/analytics/chart-kit';
import { StatusPill, priorityTone } from '../ui/status-pill';
import type { Ticket } from '../../types/ticket';

interface Props {
  myTickets: Ticket[];
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function slaCountdown(dueStr: string, now: number) {
  const diff = new Date(dueStr).getTime() - now;
  const breached = diff < 0;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86400e3);
  const h = Math.floor((abs % 86400e3) / 3600e3);
  const label = (d > 0 ? `${d}d ` : '') + `${h}h`;
  return { breached, soon: !breached && abs < 12 * 3600e3, label };
}

export function ConsultantWorkAnalytics({ myTickets, loading, now }: Props) {
  // ── My ticket trend over the actual range ──
  const flow = useMemo(() => {
    if (myTickets.length === 0) return [];
    const start = Math.min(...myTickets.map(t => new Date(t.createdAt).getTime()));
    const latest = Math.max(now, ...myTickets.map(t => new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()));
    const days: { key: string; label: string; created: number; closed: number }[] = [];
    const cursor = new Date(start); cursor.setHours(0, 0, 0, 0);
    const end = new Date(latest);
    while (cursor <= end && days.length < 92) {
      days.push({ key: cursor.toISOString().slice(0, 10), label: dayLabel(cursor.toISOString()), created: 0, closed: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    myTickets.forEach(t => {
      const ci = idx[dayKey(t.createdAt)];
      if (ci !== undefined) days[ci].created++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = idx[dayKey(r)];
        if (ri !== undefined) days[ri].closed++;
      }
    });
    return days;
  }, [myTickets, now]);
  const flowReady = flow.length >= 2 && (hasTrendSignal(flow.map(d => ({ value: d.created })), 2) || hasTrendSignal(flow.map(d => ({ value: d.closed })), 2));

  // ── My SLA timers (open tickets, most urgent first) ──
  const timers = useMemo(() => {
    return myTickets
      .filter(t => isOpen(t) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable')
      .map(t => ({ t, c: slaCountdown(t.slaDueAt, now) }))
      .sort((a, b) => new Date(a.t.slaDueAt).getTime() - new Date(b.t.slaDueAt).getTime());
  }, [myTickets, now]);

  // ── Throughput + avg handle time ──
  const throughput = useMemo(() => {
    const closed = myTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved');
    const withTimes = closed.filter(t => t.resolvedAt || t.closedAt);
    const avgHrs = withTimes.length > 0
      ? withTimes.reduce((s, t) => s + (new Date(t.resolvedAt || t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600e3, 0) / withTimes.length
      : null;
    return { closed: closed.length, avgHrs, n: withTimes.length };
  }, [myTickets]);

  // ── My module mix (assigned tickets per SAP module) ──
  const modules = useMemo(() => {
    const map: Record<string, number> = {};
    myTickets.forEach(t => { if (t.sapModule) map[t.sapModule] = (map[t.sapModule] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [myTickets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-section text-ink">My Performance</h2>
        <p className="type-meta text-ink-muted">Your timers, throughput and where your tickets sit.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* My ticket trend */}
        <ChartFrame title="My Ticket Trend" context="Created vs closed, by day" icon={Activity} loading={loading} ready={flowReady} emptyHint="Trends appear once you have activity across at least two days." height={220} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 480, height: 220 }}>
            <LineChart data={flow} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Line type={HONEST_LINE} dataKey="created" name="Created" stroke={CHART.brand} strokeWidth={2} dot={{ r: 3, fill: CHART.brand }} />
              <Line type={HONEST_LINE} dataKey="closed" name="Closed" stroke={CHART.success} strokeWidth={2} dot={{ r: 3, fill: CHART.success }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Throughput + handle time */}
        <ChartFrame title="Throughput" context="Closed & average handle time" icon={Gauge} loading={loading} ready height={220}>
          <div className="flex h-full flex-col justify-center gap-4">
            <div>
              <div className="type-num text-4xl font-semibold tracking-tight text-ink">{throughput.closed}</div>
              <div className="type-status text-ink-muted">Tickets closed (since launch)</div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="type-num text-2xl font-semibold tracking-tight text-ink">
                {throughput.avgHrs === null ? '—' : `${throughput.avgHrs.toFixed(1)}h`}
              </div>
              <div className="type-status text-ink-muted">
                {throughput.avgHrs === null ? 'No resolved tickets yet' : `Avg handle time · n=${throughput.n}`}
              </div>
            </div>
          </div>
        </ChartFrame>

        {/* My SLA timers */}
        <ChartFrame title="My SLA Timers" context={`${timers.length} open with a target`} icon={Timer} loading={loading} ready={timers.length > 0} emptyTitle="No active SLA timers" emptyHint="Open tickets with an SLA target will count down here." emptyIcon={Timer} height={timers.length > 0 ? 0 : 200} bodyClassName="!min-h-0" className="lg:col-span-2">
          <ul className="divide-y divide-line">
            {timers.slice(0, 6).map(({ t, c }) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <StatusPill tone={priorityTone(t.priority)} dot pulse={t.priority === 'Critical'}>{t.priority}</StatusPill>
                  <div className="min-w-0">
                    <span className="type-meta type-num block font-semibold text-ink">{t.ticketNumber || t.id}</span>
                    <span className="type-status block truncate text-ink-muted">{t.title}</span>
                  </div>
                </div>
                <span className={`type-status type-num inline-flex shrink-0 items-center gap-1 font-semibold ${c.breached ? 'text-critical' : c.soon ? 'text-warning-strong' : 'text-ink-secondary'}`}>
                  {c.breached ? <AlertTriangle size={11} /> : <Clock size={11} />}
                  {c.breached ? `Breached ${c.label}` : `Due ${c.label}`}
                </span>
              </li>
            ))}
          </ul>
        </ChartFrame>

        {/* My module mix */}
        <ChartFrame title="My Module Mix" context="Assigned tickets per module" icon={Layers} loading={loading} ready={modules.length > 0} emptyHint="No assigned tickets with a module yet." height={200}>
          <ResponsiveContainer width="100%" height={200} initialDimension={{ width: 320, height: 200 }}>
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
