'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { Gauge, Activity, Layers, Users, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { ChartFrame } from './chart-frame';
import {
  CHART, PRIORITY_FILL, axisProps, gridProps, ChartTooltip, hasTrendSignal, HONEST_LINE,
} from '../../lib/analytics/chart-kit';
import type { Ticket } from '../../types/ticket';
import { StatusPill, slaTone } from '../ui/status-pill';

interface Props {
  tickets: Ticket[];
  consultantProfiles: { id: string; full_name: string; is_active?: boolean }[];
  escalations: { id: string; ticketId: string; ticketNumber?: string; reason?: string; customer?: string }[];
  loading: boolean;
  now: number;
}

const isOpen = (t: Ticket) => t.status !== 'Closed' && t.status !== 'Resolved';
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function AdminOperationsIntelligence({ tickets, consultantProfiles, escalations, loading, now }: Props) {
  // ── SLA compliance (incidents only) — a stat with context, not a fake trend ──
  const sla = useMemo(() => {
    const incidents = tickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
    const breached = incidents.filter(t => {
      const due = new Date(t.slaDueAt).getTime();
      const end = t.status === 'Resolved' || t.status === 'Closed'
        ? new Date(t.resolvedAt || t.closedAt || now).getTime()
        : now;
      return end > due;
    });
    const pct = incidents.length > 0 ? Math.round(((incidents.length - breached.length) / incidents.length) * 100) : null;
    return { total: incidents.length, breached: breached.length, met: incidents.length - breached.length, pct };
  }, [tickets, now]);

  // ── Ticket flow over the ACTUAL data range (daily, straight segments) ──
  const flow = useMemo(() => {
    if (tickets.length === 0) return [];
    const start = Math.min(...tickets.map(t => new Date(t.createdAt).getTime()));
    // End at the latest real activity OR now — never cut the range short if the
    // page's clock is frozen behind the data.
    const latest = Math.max(now, ...tickets.map(t =>
      new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime()));
    const days: { key: string; label: string; created: number; resolved: number }[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(latest);
    while (cursor <= end && days.length < 92) {
      const k = cursor.toISOString().slice(0, 10);
      days.push({ key: k, label: dayLabel(cursor.toISOString()), created: 0, resolved: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    tickets.forEach(t => {
      const ci = idx[dayKey(t.createdAt)];
      if (ci !== undefined) days[ci].created++;
      const r = t.resolvedAt || t.closedAt;
      if (r && (t.status === 'Resolved' || t.status === 'Closed')) {
        const ri = idx[dayKey(r)];
        if (ri !== undefined) days[ri].resolved++;
      }
    });
    return days;
  }, [tickets, now]);
  const flowReady = flow.length >= 2 && (hasTrendSignal(flow.map(d => ({ value: d.created })), 2) || hasTrendSignal(flow.map(d => ({ value: d.resolved })), 2));

  // ── Priority mix of OPEN tickets (only categories that exist) ──
  const priority = useMemo(() => {
    const open = tickets.filter(isOpen);
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return order
      .map(p => ({ name: p, value: open.filter(t => t.priority === p).length }))
      .filter(d => d.value > 0);
  }, [tickets]);

  // ── Module backlog (ranked open tickets per SAP module) ──
  const modules = useMemo(() => {
    const open = tickets.filter(isOpen);
    const map: Record<string, number> = {};
    open.forEach(t => { if (t.sapModule) map[t.sapModule] = (map[t.sapModule] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tickets]);

  // ── Workload by consultant — DEGRADES to a stat/table below 2 entities ──
  const workload = useMemo(() => {
    const open = tickets.filter(isOpen);
    const byName: Record<string, number> = {};
    open.forEach(t => { const n = t.assignedConsultant || 'Unassigned'; byName[n] = (byName[n] || 0) + 1; });
    const rows = Object.entries(byName).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const realConsultants = rows.filter(r => r.name !== 'Unassigned');
    return { rows, realConsultants };
  }, [tickets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="type-section text-ink">Operations Intelligence</h2>
        <p className="type-meta text-ink-muted">Decision-grade signal across the active service desk.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* SLA compliance — gauge stat */}
        <ChartFrame
          title="SLA Compliance"
          context="Incidents since launch"
          icon={Gauge}
          loading={loading}
          ready={sla.total > 0}
          emptyHint="No incident tickets with an SLA target yet."
          height={240}
        >
          <div className="flex h-full flex-col items-center justify-center">
            <div className="type-num text-5xl font-semibold tracking-tight text-ink">
              {sla.pct}<span className="text-2xl text-ink-muted">%</span>
            </div>
            <StatusPill tone={slaTone(sla.pct !== null && sla.pct >= 95 ? 'healthy' : sla.pct !== null && sla.pct >= 80 ? 'warning' : 'breached')} className="mt-2">
              {sla.pct !== null && sla.pct >= 95 ? 'On target' : 'Below 95% target'}
            </StatusPill>
            <div className="mt-4 flex w-full max-w-[220px] items-center gap-4">
              <div className="flex-1 text-center">
                <div className="type-num text-lg font-semibold text-success">{sla.met}</div>
                <div className="type-status text-ink-muted">Met</div>
              </div>
              <div className="h-8 w-px bg-line" />
              <div className="flex-1 text-center">
                <div className="type-num text-lg font-semibold text-critical">{sla.breached}</div>
                <div className="type-status text-ink-muted">Breached</div>
              </div>
            </div>
          </div>
        </ChartFrame>

        {/* Ticket flow — created vs resolved, actual range */}
        <ChartFrame
          title="Ticket Flow"
          context="Created vs resolved, by day"
          icon={Activity}
          loading={loading}
          ready={flowReady}
          emptyHint="Trends appear once there are at least two active days."
          height={240}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 480, height: 240 }}>
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

        {/* Priority mix */}
        <ChartFrame
          title="Open by Priority"
          context="Active backlog"
          icon={AlertTriangle}
          loading={loading}
          ready={priority.length > 0}
          emptyHint="No open tickets right now."
          height={220}
        >
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 320, height: 220 }}>
            <BarChart data={priority} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                {priority.map(p => <Cell key={p.name} fill={PRIORITY_FILL[p.name] ?? CHART.brand} />)}
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Module backlog */}
        <ChartFrame
          title="Backlog by Module"
          context="Open tickets per SAP module"
          icon={Layers}
          loading={loading}
          ready={modules.length > 0}
          emptyHint="No open tickets assigned to a module yet."
          height={220}
        >
          <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 320, height: 220 }}>
            <BarChart data={modules} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={64} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
              <Bar dataKey="value" fill={CHART.brand} radius={[0, 4, 4, 0]} barSize={18}>
                <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        {/* Workload — degrades to a stat/table when there's a single carrier */}
        <ChartFrame
          title="Consultant Workload"
          context="Open tickets per consultant"
          icon={Users}
          loading={loading}
          ready={workload.rows.length > 0}
          emptyHint="No assigned open tickets yet."
          height={220}
        >
          {workload.realConsultants.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 320, height: 220 }}>
              <BarChart data={workload.rows} layout="vertical" margin={{ top: 0, right: 28, left: 4, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={88} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.grid }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {workload.rows.map(r => <Cell key={r.name} fill={r.name === 'Unassigned' ? CHART.axis : CHART.info} />)}
                  <LabelList dataKey="value" position="right" className="type-num" fill={CHART.ink} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col justify-center gap-2">
              {workload.rows.map(r => (
                <div key={r.name} className="flex items-center justify-between rounded-md border border-line bg-surface-muted/50 px-3 py-2">
                  <span className="type-meta truncate text-ink">{r.name}</span>
                  <span className="type-num type-meta font-semibold text-ink">{r.value} open</span>
                </div>
              ))}
              <p className="type-status mt-1 text-ink-muted">Comparison chart unlocks with a second active consultant.</p>
            </div>
          )}
        </ChartFrame>
      </div>

      {/* Escalations needing attention — a list, not a chart */}
      <ChartFrame
        title="Escalations Needing Attention"
        context={`${escalations.length} active`}
        icon={ShieldCheck}
        loading={loading}
        ready={escalations.length > 0}
        emptyTitle="No active escalations"
        emptyHint="Escalated tickets requiring intervention will surface here."
        emptyIcon={ShieldCheck}
        height={escalations.length > 0 ? 0 : 160}
        bodyClassName="!min-h-0"
      >
        <ul className="divide-y divide-line">
          {escalations.slice(0, 6).map(e => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-critical-soft">
                  <AlertTriangle size={13} className="text-critical" />
                </span>
                <div className="min-w-0">
                  <span className="type-meta type-num block font-semibold text-ink">{e.ticketNumber || e.ticketId}</span>
                  <span className="type-status block truncate text-ink-muted">{e.customer} · {e.reason || 'Escalation raised'}</span>
                </div>
              </div>
              <Link href={`/admin/tickets/${e.ticketId}`} className="type-status inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink">
                Review <ArrowRight size={11} />
              </Link>
            </li>
          ))}
        </ul>
      </ChartFrame>
    </div>
  );
}
