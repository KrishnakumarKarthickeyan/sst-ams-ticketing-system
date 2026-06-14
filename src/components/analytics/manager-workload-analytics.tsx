'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell, LabelList, ReferenceLine,
} from 'recharts';
import type { Ticket, CustomerContract } from '../../types/ticket';
import { ChartCard, ChartTooltip } from './chart-primitives';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CHART_COLORS, SEMANTIC } from '../../lib/chart-theme';
import {
  buildBuckets, bucketIndex, autoGranularity,
  aggregateConsultants, aggregateCustomers, utilizationBand, type Bucket,
} from '../../lib/analytics/derive';

interface Props {
  section: 'consultants' | 'customers';
  tickets: Ticket[];
  profiles: { id: string; full_name?: string; role?: string }[];
  contracts: CustomerContract[];
  now: number;
}

function businessDays(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0; const c = new Date(startMs); c.setHours(0, 0, 0, 0); const end = new Date(endMs);
  while (c <= end) { const d = c.getDay(); if (d !== 0 && d !== 6) n++; c.setDate(c.getDate() + 1); }
  return n;
}
const UTIL_INDICATOR: Record<'ok' | 'warning' | 'over', string> = { ok: 'bg-blue-600', warning: 'bg-amber-500', over: 'bg-red-600' };
const effortDate = (e: { workDate?: string; activityDate?: string; createdAt?: string }) => e.workDate || e.activityDate || e.createdAt || '';
const approved = (e: { status?: string }) => e.status === 'Approved';

export function ManagerWorkloadAnalytics({ section, tickets, profiles, contracts, now }: Props) {
  const { periodStart, periodEnd } = useMemo(() => {
    const created = tickets.map(t => new Date(t.createdAt).getTime()).filter(Number.isFinite);
    const activity = tickets.flatMap(t => (t.efforts || []).map(e => new Date(effortDate(e)).getTime())).filter(Number.isFinite);
    return {
      periodStart: created.length ? Math.min(...created) : now,
      periodEnd: Math.max(now, ...(activity.length ? activity : [now]), ...(created.length ? created : [now])),
    };
  }, [tickets, now]);
  const buckets = useMemo(() => buildBuckets(periodStart, periodEnd, autoGranularity(periodStart, periodEnd)), [periodStart, periodEnd]);
  const capacityHours = useMemo(() => businessDays(periodStart, periodEnd) * 8, [periodStart, periodEnd]);

  if (section === 'consultants') {
    return <ConsultantsSection tickets={tickets} now={now} buckets={buckets} capacityHours={capacityHours} />;
  }
  return <CustomersSection tickets={tickets} contracts={contracts} now={now} buckets={buckets} />;
}

// ─────────────────────────── CONSULTANTS ───────────────────────────
function ConsultantsSection({ tickets, now, buckets, capacityHours }: {
  tickets: Ticket[]; now: number; buckets: Bucket[]; capacityHours: number;
}) {
  const agg = useMemo(() => aggregateConsultants(tickets, now), [tickets, now]);
  const util = useMemo(() => agg.map(a => ({
    name: a.name, value: capacityHours > 0 ? Math.round((a.loggedHours / capacityHours) * 100) : 0,
    logged: Math.round(a.loggedHours * 10) / 10,
  })).sort((a, b) => b.value - a.value), [agg, capacityHours]);

  const activeResolved = useMemo(() => agg.map(a => ({ name: a.name, Active: a.active, Resolved: a.closed }))
    .filter(d => d.Active + d.Resolved > 0).slice(0, 12), [agg]);

  const busyRows = useMemo(() => agg.map(a => {
    const u = capacityHours > 0 ? Math.round((a.loggedHours / capacityHours) * 100) : 0;
    const busy = u > 80 || a.active > 5;
    return { name: a.name, util: u, active: a.active, busy };
  }).sort((a, b) => b.util - a.util), [agg, capacityHours]);

  const aht = useMemo(() => agg.filter(a => a.avgResolutionH !== null)
    .map(a => ({ name: a.name, value: Math.round((a.avgResolutionH as number) * 10) / 10 }))
    .sort((a, b) => b.value - a.value).slice(0, 12), [agg]);

  // Module specialization (stacked per consultant)
  const { moduleData, moduleKeys } = useMemo(() => {
    const byCons = new Map<string, Record<string, number>>();
    const modSet = new Set<string>();
    tickets.forEach(t => {
      const c = t.assignedConsultant; if (!c || !t.sapModule) return;
      modSet.add(t.sapModule);
      const row = byCons.get(c) || {}; row[t.sapModule] = (row[t.sapModule] || 0) + 1; byCons.set(c, row);
    });
    const keys = Array.from(modSet);
    const totalOf = (row: Record<string, unknown>) => keys.reduce((s, k) => s + (Number(row[k]) || 0), 0);
    const data = Array.from(byCons.entries()).map(([name, mods]) => ({ name, ...mods }))
      .sort((a, b) => totalOf(b) - totalOf(a))
      .slice(0, 12);
    return { moduleData: data, moduleKeys: keys };
  }, [tickets]);

  // Hours logged trend (selectable consultant)
  const names = useMemo(() => agg.map(a => a.name).sort(), [agg]);
  const [selected, setSelected] = useState<string>('');
  const sel = selected || names[0] || '';
  const hoursTrend = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => {
      if (t.assignedConsultant !== sel) return;
      (t.efforts || []).forEach(e => {
        if (!approved(e)) return;
        const i = bucketIndex(buckets, new Date(effortDate(e)).getTime());
        if (i >= 0) rows[i].value += Number(e.hoursWorked || e.hoursLogged || 0);
      });
    });
    return rows.map(r => ({ ...r, value: Math.round(r.value * 10) / 10 }));
  }, [buckets, tickets, sel]);
  const hoursTrendEmpty = hoursTrend.every(r => r.value === 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">Consultants</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Utilization Overview — progress list */}
        <ChartCard title="Utilization — Capacity vs Logged" isEmpty={util.length === 0} contentClassName="overflow-auto">
          <div className="space-y-3">
            {util.map(u => {
              const band = utilizationBand(u.value);
              return (
                <div key={u.name} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="font-medium">{u.name}</span><span className="tabular-nums text-muted-foreground">{u.logged}h · {u.value}%</span></div>
                  <Progress value={u.value} indicatorClassName={UTIL_INDICATOR[band]} />
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Utilization % bar with 100% reference */}
        <ChartCard title="Utilization %" isEmpty={util.length === 0} action={<span className="text-xs text-muted-foreground">≈{capacityHours}h capacity</span>}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={util.slice(0, 12)} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
              <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <ReferenceLine x={100} stroke={SEMANTIC.danger} strokeDasharray="4 4" label={{ value: '100%', fontSize: 10, fill: SEMANTIC.danger, position: 'top' }} />
              <Bar dataKey="value" name="Utilization" radius={[0, 4, 4, 0]} barSize={14}>
                {util.slice(0, 12).map(u => <Cell key={u.name} fill={u.value > 90 ? SEMANTIC.danger : u.value >= 70 ? SEMANTIC.warning : CHART_COLORS[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Active vs Resolved (grouped) */}
        <ChartCard title="Active vs Resolved per Consultant" isEmpty={activeResolved.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeResolved} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Active" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="Resolved" fill={SEMANTIC.success} radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Busy / Free summary */}
        <ChartCard title="Busy / Free" isEmpty={busyRows.length === 0} contentClassName="overflow-auto">
          <div className="divide-y">
            {busyRows.map(r => (
              <div key={r.name} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">{r.active} active · {r.util}%</span>
                  <Badge variant="outline" className={r.busy ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>{r.busy ? 'Busy' : 'Free'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Hours Logged Trend (selectable) */}
        <ChartCard
          title="Hours Logged Trend"
          isEmpty={names.length === 0 || hoursTrendEmpty}
          emptyHint={names.length === 0 ? 'No consultant activity' : 'No approved hours for this consultant'}
          action={names.length > 0 ? (
            <Select value={sel} onValueChange={setSelected}>
              <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{names.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          ) : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hoursTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} width={34} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} />
              <Line type="linear" dataKey="value" name="Hours" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Module Specialization (stacked) */}
        <ChartCard title="Module Specialization" isEmpty={moduleData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              {moduleKeys.map((k, i) => (
                <Bar key={k} dataKey={k} stackId="mod" fill={CHART_COLORS[i % CHART_COLORS.length]} barSize={14}
                  radius={i === moduleKeys.length - 1 ? [0, 4, 4, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Avg Handling Time */}
        <ChartCard title="Avg Handling Time (h)" isEmpty={aht.length === 0} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aht} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 12 }} width={36} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Avg Handling" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} barSize={24}>
                <LabelList dataKey="value" position="top" fontSize={10} formatter={(v) => `${v}h`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─────────────────────────── CUSTOMERS ───────────────────────────
function CustomersSection({ tickets, contracts, now, buckets }: {
  tickets: Ticket[]; contracts: CustomerContract[]; now: number; buckets: Bucket[];
}) {
  const agg = useMemo(() => aggregateCustomers(tickets, now), [tickets, now]);
  const allocByOrg = useMemo(() => {
    const m = new Map<string, number>();
    (contracts || []).forEach(c => { if (c.organizationName) m.set(c.organizationName, (m.get(c.organizationName) || 0) + (c.totalHours || 0)); });
    return m;
  }, [contracts]);

  const consumedVsAlloc = useMemo(() => agg.map(a => {
    const alloc = allocByOrg.get(a.org) || 0;
    return { org: a.org, consumed: Math.round(a.loggedHours * 10) / 10, allocation: alloc, util: alloc > 0 ? Math.round((a.loggedHours / alloc) * 100) : null };
  }).sort((a, b) => b.consumed - a.consumed), [agg, allocByOrg]);

  const volume = useMemo(() => agg.map(a => ({ org: a.org, value: a.tickets })).sort((a, b) => b.value - a.value).slice(0, 10), [agg]);
  const breaches = useMemo(() => agg.map(a => ({ org: a.org, value: a.slaBreaches })).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10), [agg]);
  const contractUtil = useMemo(() => consumedVsAlloc.filter(d => d.util !== null).map(d => ({ org: d.org, value: d.util as number })).sort((a, b) => b.value - a.value).slice(0, 12), [consumedVsAlloc]);

  // Monthly burn rate (selectable customer)
  const orgs = useMemo(() => agg.map(a => a.org).sort(), [agg]);
  const [selected, setSelected] = useState<string>('');
  const sel = selected || orgs[0] || '';
  const burn = useMemo(() => {
    const rows = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => {
      if (t.organization !== sel) return;
      (t.efforts || []).forEach(e => {
        if (!approved(e)) return;
        const i = bucketIndex(buckets, new Date(effortDate(e)).getTime());
        if (i >= 0) rows[i].value += Number(e.hoursWorked || e.hoursLogged || 0);
      });
    });
    return rows.map(r => ({ ...r, value: Math.round(r.value * 10) / 10 }));
  }, [buckets, tickets, sel]);
  const burnEmpty = burn.every(r => r.value === 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">Customers</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hours consumed vs allocation — progress list */}
        <ChartCard title="Hours Consumed vs Allocation" isEmpty={consumedVsAlloc.length === 0} contentClassName="overflow-auto">
          <div className="space-y-3">
            {consumedVsAlloc.map(d => {
              const pct = d.util ?? 0;
              const band = utilizationBand(pct);
              return (
                <div key={d.org} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="font-medium">{d.org}</span>
                    <span className="tabular-nums text-muted-foreground">{d.consumed}h / {d.allocation || '—'}h{d.util !== null ? ` · ${d.util}%` : ''}</span>
                  </div>
                  <Progress value={pct} indicatorClassName={UTIL_INDICATOR[band]} />
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Consumed vs Contract bar */}
        <ChartCard title="Consumed vs Contract" isEmpty={consumedVsAlloc.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumedVsAlloc.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} unit="h" />
              <YAxis type="category" dataKey="org" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTooltip unit="h" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="allocation" name="Contract" fill={CHART_COLORS[4]} barSize={10} radius={[0, 3, 3, 0]} />
              <Bar dataKey="consumed" name="Consumed" fill={CHART_COLORS[0]} barSize={10} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Ticket volume per customer */}
        <ChartCard title="Ticket Volume per Customer (Top 10)" isEmpty={volume.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volume} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="org" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Tickets" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* SLA breaches per customer */}
        <ChartCard title="SLA Breaches per Customer" isEmpty={breaches.length === 0} emptyHint="No SLA breaches in this period">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breaches} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="org" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="value" name="Breaches" fill={SEMANTIC.danger} radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="value" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly burn rate (selectable) */}
        <ChartCard
          title="Burn Rate Trend"
          isEmpty={orgs.length === 0 || burnEmpty}
          emptyHint={orgs.length === 0 ? 'No customer activity' : 'No approved hours for this customer'}
          action={orgs.length > 0 ? (
            <Select value={sel} onValueChange={setSelected}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{orgs.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          ) : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={burn} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={{ fontSize: 12 }} width={34} unit="h" />
              <Tooltip content={<ChartTooltip unit="h" />} />
              <Line type="linear" dataKey="value" name="Hours" stroke={SEMANTIC.warning} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Contract utilization ranked */}
        <ChartCard title="Contract Utilization %" isEmpty={contractUtil.length === 0} emptyHint="No active contracts with allocation">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contractUtil} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
              <YAxis type="category" dataKey="org" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <ReferenceLine x={100} stroke={SEMANTIC.danger} strokeDasharray="4 4" label={{ value: '100%', fontSize: 10, fill: SEMANTIC.danger, position: 'top' }} />
              <Bar dataKey="value" name="Utilization" radius={[0, 4, 4, 0]} barSize={14}>
                {contractUtil.map(d => <Cell key={d.org} fill={d.value > 100 ? SEMANTIC.danger : d.value >= 80 ? SEMANTIC.warning : CHART_COLORS[1]} />)}
                <LabelList dataKey="value" position="right" fontSize={10} formatter={(v) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
