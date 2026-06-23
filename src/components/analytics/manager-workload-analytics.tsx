'use client';

import React, { useMemo, useState } from 'react';
import { Users, Gauge, Clock, AlertTriangle, Building2, Briefcase } from 'lucide-react';
import type { Ticket, CustomerContract } from '../../types/ticket';
import { ChartCard } from './chart-primitives';
import { BarH, BarV, Trend } from './chart-builders';
import { StatCard } from '../ui/stat-card';
import { DataTable, type DataTableColumn } from '../ui/data-table';
import { StatusPill, type PillTone } from '../ui/status-pill';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CHART_COLORS, SEMANTIC } from '../../lib/chart-theme';
import {
  buildBuckets, bucketIndex, autoGranularity, approvedHours, completionDate,
  aggregateConsultants, aggregateCustomers, utilizationBand, type Bucket,
} from '../../lib/analytics/derive';

interface Props {
  section: 'consultants' | 'customers';
  tickets: Ticket[];
  profiles: { id: string; full_name?: string; role?: string }[];
  contracts: CustomerContract[];
  now: number;
}

// Utilization band → semantic Progress fill (the contract: <70 ok, 70–90 warn, >90 over).
const BAND_FILL: Record<'ok' | 'warning' | 'over', string> = { ok: 'bg-info', warning: 'bg-warning', over: 'bg-critical' };
const utilColor = (pct: number) => (pct > 90 ? SEMANTIC.danger : pct >= 70 ? SEMANTIC.warning : CHART_COLORS[0]);

const ROW_PX = 28;
const dynHeight = (count: number) => Math.max(240, count * ROW_PX);

function businessDays(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0; const c = new Date(startMs); c.setHours(0, 0, 0, 0); const end = new Date(endMs);
  while (c <= end) { const d = c.getDay(); if (d !== 0 && d !== 6) n++; c.setDate(c.getDate() + 1); }
  return n;
}

function UtilCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-muted">—</span>;
  const band = utilizationBand(value);
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} indicatorClassName={BAND_FILL[band]} className="h-2 flex-1" />
      <span className="type-num w-10 shrink-0 text-right text-ink-secondary">{value}%</span>
    </div>
  );
}

export function ManagerWorkloadAnalytics({ section, tickets, contracts, now }: Props) {
  const { periodStart, periodEnd } = useMemo(() => {
    const created = tickets.map(t => new Date(t.createdAt).getTime()).filter(Number.isFinite);
    const done = tickets.map(t => completionDate(t)).filter(Number.isFinite);
    return {
      periodStart: created.length ? Math.min(...created) : now,
      periodEnd: Math.max(now, ...(done.length ? done : [now]), ...(created.length ? created : [now])),
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
type ConsRow = { id: string; name: string; active: number; resolved: number; loggedHours: number; avgHandling: number | null; utilization: number; busy: boolean };

function ConsultantsSection({ tickets, now, buckets, capacityHours }: {
  tickets: Ticket[]; now: number; buckets: Bucket[]; capacityHours: number;
}) {
  const agg = useMemo(() => aggregateConsultants(tickets, now), [tickets, now]);

  const rows = useMemo<ConsRow[]>(() => agg.map(a => {
    const utilization = capacityHours > 0 ? Math.round((a.loggedHours / capacityHours) * 100) : 0;
    return {
      id: a.id, name: a.name, active: a.active, resolved: a.closed,
      loggedHours: Math.round(a.loggedHours * 10) / 10,
      avgHandling: a.avgResolutionH !== null ? Math.round(a.avgResolutionH * 10) / 10 : null,
      utilization, busy: utilization > 80 || a.active > 5,
    };
  }), [agg, capacityHours]);

  const kpis = useMemo(() => {
    const totalLogged = Math.round(rows.reduce((s, r) => s + r.loggedHours, 0));
    const avgUtil = rows.length ? Math.round(rows.reduce((s, r) => s + r.utilization, 0) / rows.length) : 0;
    const overloaded = rows.filter(r => r.utilization > 90 || r.active > 5).length;
    return { count: rows.length, totalLogged, avgUtil, overloaded };
  }, [rows]);

  // Charts
  const util = useMemo(() => rows.map(r => ({ name: r.name, value: r.utilization })).sort((a, b) => b.value - a.value), [rows]);
  const activeResolved = useMemo(() => rows.map(r => ({ name: r.name, Active: r.active, Resolved: r.resolved }))
    .filter(d => d.Active + d.Resolved > 0).sort((a, b) => (b.Active + b.Resolved) - (a.Active + a.Resolved)), [rows]);

  const names = useMemo(() => rows.map(r => r.name).sort(), [rows]);
  const [selected, setSelected] = useState<string>('');
  const sel = selected || names[0] || '';
  const hoursTrend = useMemo(() => {
    const r = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => {
      if (t.assignedConsultant !== sel) return;
      const h = approvedHours(t); if (h <= 0) return;
      const i = bucketIndex(buckets, completionDate(t));
      if (i >= 0) r[i].value += h;
    });
    return r.map(x => ({ ...x, value: Math.round(x.value * 10) / 10 }));
  }, [buckets, tickets, sel]);
  const hoursTrendEmpty = hoursTrend.every(r => r.value === 0);

  const utilBand = utilizationBand(kpis.avgUtil);
  const utilTone: PillTone = utilBand === 'over' ? 'critical' : utilBand === 'warning' ? 'warning' : 'brand';

  const columns = useMemo<DataTableColumn<ConsRow>[]>(() => [
    { key: 'name', header: 'Consultant', sortValue: r => r.name, render: r => <span className="font-medium text-ink">{r.name}</span> },
    {
      key: 'status', header: 'Status', sortValue: r => (r.busy ? 1 : 0), exportValue: r => (r.busy ? 'Busy' : 'Free'),
      render: r => <StatusPill tone={r.busy ? 'warning' : 'success'} dot>{r.busy ? 'Busy' : 'Free'}</StatusPill>,
    },
    { key: 'active', header: 'Active', align: 'right', sortValue: r => r.active, render: r => <span className="type-num text-ink">{r.active}</span> },
    { key: 'resolved', header: 'Resolved', align: 'right', sortValue: r => r.resolved, render: r => <span className="type-num text-ink-secondary">{r.resolved}</span> },
    { key: 'logged', header: 'Logged Hours', align: 'right', sortValue: r => r.loggedHours, render: r => <span className="type-num text-ink">{r.loggedHours.toFixed(1)}</span> },
    {
      key: 'aht', header: 'Avg Handling', align: 'right', sortValue: r => r.avgHandling ?? -1, exportValue: r => r.avgHandling ?? 0,
      render: r => <span className="type-num">{r.avgHandling !== null ? `${r.avgHandling.toFixed(1)}h` : '—'}</span>,
    },
    { key: 'util', header: 'Utilization', width: '200px', sortValue: r => r.utilization, render: r => <UtilCell value={r.utilization} /> },
  ], []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Consultants" value={kpis.count} icon={Users} tone="brand" />
        <StatCard label="Avg Utilization" value={`${kpis.avgUtil}%`} icon={Gauge} tone={utilTone} progress={kpis.avgUtil} progressTone={utilTone} sub={`≈${capacityHours}h capacity`} />
        <StatCard label="Total Logged Hours" value={`${kpis.totalLogged}h`} icon={Clock} tone="info" />
        <StatCard label="Overloaded" value={kpis.overloaded} icon={AlertTriangle} tone={kpis.overloaded > 0 ? 'critical' : 'success'} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => r.id}
        pageSize={10}
        exportName="consultant-workload"
        emptyIcon={Users}
        emptyTitle="No consultant workload"
        emptyDescription="No tickets are assigned to consultants for this filter."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ChartCard title="Utilization %" isEmpty={util.length === 0} action={<span className="type-status text-ink-muted">≈{capacityHours}h capacity</span>} height="" contentClassName="min-h-[300px] max-h-[480px] overflow-y-auto">
          <div style={{ height: dynHeight(util.length) }}>
            <BarH data={util} categoryKey="name" series={[{ key: 'value', name: 'Utilization' }]} unit="%" referenceX={100} colorFor={r => utilColor(r.value)} categoryWidth={120} />
          </div>
        </ChartCard>

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
          <Trend data={hoursTrend} categoryKey="label" series={[{ key: 'value', name: 'Hours', color: CHART_COLORS[0] }]} unit="h" />
        </ChartCard>

        <ChartCard title="Active vs Resolved per Consultant" isEmpty={activeResolved.length === 0} className="lg:col-span-2" height="" contentClassName="min-h-[300px] max-h-[480px] overflow-y-auto">
          <div style={{ height: dynHeight(activeResolved.length) }}>
            <BarH data={activeResolved} categoryKey="name" series={[{ key: 'Active', color: CHART_COLORS[0] }, { key: 'Resolved', color: SEMANTIC.success }]} stack={false} legend categoryWidth={120} />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ─────────────────────────── CUSTOMERS ───────────────────────────
type CustRow = { id: string; org: string; tickets: number; open: number; consumed: number; allocation: number; utilization: number | null; breaches: number };

function CustomersSection({ tickets, contracts, now, buckets }: {
  tickets: Ticket[]; contracts: CustomerContract[]; now: number; buckets: Bucket[];
}) {
  const agg = useMemo(() => aggregateCustomers(tickets, now), [tickets, now]);
  const allocByOrg = useMemo(() => {
    const m = new Map<string, number>();
    (contracts || []).forEach(c => { if (c.organizationName) m.set(c.organizationName, (m.get(c.organizationName) || 0) + (c.totalHours || 0)); });
    return m;
  }, [contracts]);

  const rows = useMemo<CustRow[]>(() => agg.map(a => {
    const allocation = allocByOrg.get(a.org) || 0;
    return {
      id: a.org, org: a.org, tickets: a.tickets, open: a.open,
      consumed: Math.round(a.loggedHours * 10) / 10, allocation,
      utilization: allocation > 0 ? Math.round((a.loggedHours / allocation) * 100) : null,
      breaches: a.slaBreaches,
    };
  }).sort((a, b) => b.consumed - a.consumed), [agg, allocByOrg]);

  const kpis = useMemo(() => {
    const totalConsumed = Math.round(rows.reduce((s, r) => s + r.consumed, 0));
    const totalBreaches = rows.reduce((s, r) => s + r.breaches, 0);
    const utilRows = rows.filter(r => r.utilization !== null);
    const avgUtil = utilRows.length ? Math.round(utilRows.reduce((s, r) => s + (r.utilization as number), 0) / utilRows.length) : 0;
    return { count: rows.length, totalConsumed, totalBreaches, avgUtil };
  }, [rows]);

  const consumedVsAlloc = useMemo(() => rows.map(r => ({ org: r.org, Consumed: r.consumed, Allocation: r.allocation })), [rows]);
  const volume = useMemo(() => rows.map(r => ({ org: r.org, value: r.tickets })).sort((a, b) => b.value - a.value), [rows]);
  const breaches = useMemo(() => rows.map(r => ({ org: r.org, value: r.breaches })).filter(d => d.value > 0).sort((a, b) => b.value - a.value), [rows]);

  const orgs = useMemo(() => rows.map(r => r.org).sort(), [rows]);
  const [selected, setSelected] = useState<string>('');
  const sel = selected || orgs[0] || '';
  const burn = useMemo(() => {
    const r = buckets.map(b => ({ label: b.label, value: 0 }));
    tickets.forEach(t => {
      if (t.organization !== sel) return;
      const h = approvedHours(t); if (h <= 0) return;
      const i = bucketIndex(buckets, completionDate(t));
      if (i >= 0) r[i].value += h;
    });
    return r.map(x => ({ ...x, value: Math.round(x.value * 10) / 10 }));
  }, [buckets, tickets, sel]);
  const burnEmpty = burn.every(r => r.value === 0);

  const utilTone = (pct: number): PillTone => (pct > 90 ? 'critical' : pct >= 70 ? 'warning' : 'brand');

  const columns = useMemo<DataTableColumn<CustRow>[]>(() => [
    { key: 'org', header: 'Customer', sortValue: r => r.org, render: r => <span className="font-medium text-ink">{r.org}</span> },
    { key: 'tickets', header: 'Tickets', align: 'right', sortValue: r => r.tickets, render: r => <span className="type-num text-ink">{r.tickets}</span> },
    { key: 'open', header: 'Open', align: 'right', sortValue: r => r.open, render: r => <span className="type-num text-ink-secondary">{r.open}</span> },
    { key: 'consumed', header: 'Consumed', align: 'right', sortValue: r => r.consumed, render: r => <span className="type-num text-ink">{r.consumed.toFixed(1)}h</span> },
    { key: 'allocation', header: 'Allocation', align: 'right', sortValue: r => r.allocation, render: r => <span className="type-num text-ink-secondary">{r.allocation ? `${r.allocation}h` : '—'}</span> },
    { key: 'util', header: 'Utilization', width: '200px', sortValue: r => r.utilization ?? -1, render: r => <UtilCell value={r.utilization} /> },
    {
      key: 'breaches', header: 'SLA Breaches', align: 'right', sortValue: r => r.breaches,
      render: r => r.breaches > 0 ? <StatusPill tone="critical">{r.breaches}</StatusPill> : <span className="type-num text-ink-muted">0</span>,
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={kpis.count} icon={Building2} tone="brand" />
        <StatCard label="Total Consumed Hours" value={`${kpis.totalConsumed}h`} icon={Clock} tone="info" />
        <StatCard label="Avg Contract Utilization" value={`${kpis.avgUtil}%`} icon={Gauge} tone={utilTone(kpis.avgUtil)} progress={kpis.avgUtil} progressTone={utilTone(kpis.avgUtil)} />
        <StatCard label="SLA Breaches" value={kpis.totalBreaches} icon={AlertTriangle} tone={kpis.totalBreaches > 0 ? 'critical' : 'success'} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => r.id}
        pageSize={10}
        exportName="customer-utilization"
        emptyIcon={Building2}
        emptyTitle="No customer activity"
        emptyDescription="No tickets match this filter."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <ChartCard title="Consumed vs Contract" isEmpty={consumedVsAlloc.length === 0} height="" contentClassName="min-h-[300px] max-h-[480px] overflow-y-auto">
          <div style={{ height: dynHeight(consumedVsAlloc.length) }}>
            <BarH data={consumedVsAlloc} categoryKey="org" series={[{ key: 'Allocation', color: CHART_COLORS[4] }, { key: 'Consumed', color: CHART_COLORS[0] }]} stack={false} unit="h" legend categoryWidth={110} />
          </div>
        </ChartCard>

        <ChartCard title="Ticket Volume per Customer" isEmpty={volume.length === 0} height="" contentClassName="min-h-[300px] max-h-[480px] overflow-y-auto">
          <div style={{ height: dynHeight(volume.length) }}>
            <BarH data={volume} categoryKey="org" series={[{ key: 'value', name: 'Tickets', color: CHART_COLORS[2] }]} hideAxis valueLabels categoryWidth={110} />
          </div>
        </ChartCard>

        <ChartCard title="SLA Breaches per Customer" isEmpty={breaches.length === 0} emptyHint="No SLA breaches in this period">
          <BarH data={breaches} categoryKey="org" series={[{ key: 'value', name: 'Breaches', color: SEMANTIC.danger }]} hideAxis valueLabels categoryWidth={110} />
        </ChartCard>

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
          <Trend data={burn} categoryKey="label" series={[{ key: 'value', name: 'Hours', color: SEMANTIC.warning }]} unit="h" />
        </ChartCard>
      </div>
    </div>
  );
}
