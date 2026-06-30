'use client';

/**
 * /admin/ui-lab — ISOLATED SuperAdmin-only UI/UX showcase (evaluation sandbox).
 *
 * SCOPE LOCK: this file is fully self-contained. It imports NO app components and
 * NO app tokens; all design tokens are scoped to `.uilab` via the local <style>
 * block below, so deleting this single file restores the app exactly. All data is
 * DUMMY — no Supabase, no context, no mutations. The route inherits the SuperAdmin
 * guard from src/app/admin/layout.tsx and is intentionally NOT in the nav.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import {
  Activity, ShieldCheck, Users, Timer, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Download, RefreshCw, Search, ChevronsUpDown, Circle, Sparkles,
} from 'lucide-react';

/* ───────────────────────── dummy data (sample, not real) ───────────────────── */

type Period = '7D' | '30D' | 'QTD' | 'YTD';
const PERIODS: Period[] = ['7D', '30D', 'QTD', 'YTD'];

const KPI_BY_PERIOD: Record<Period, {
  tickets: number; ticketsDelta: number; sla: number; slaDelta: number;
  consultants: number; consultantsDelta: number; resolution: number; resolutionDelta: number;
  escalations: number; escalationsDelta: number; health: number;
}> = {
  '7D':  { tickets: 412,  ticketsDelta: 3.1,  sla: 97.2, slaDelta: 0.8,  consultants: 18, consultantsDelta: 1, resolution: 6.2, resolutionDelta: -0.4, escalations: 3, escalationsDelta: -1, health: 96 },
  '30D': { tickets: 1840, ticketsDelta: 4.2,  sla: 96.4, slaDelta: 1.1,  consultants: 18, consultantsDelta: 2, resolution: 6.8, resolutionDelta: -0.7, escalations: 5, escalationsDelta: -2, health: 94 },
  'QTD': { tickets: 5230, ticketsDelta: 6.5,  sla: 95.1, slaDelta: 1.9,  consultants: 19, consultantsDelta: 3, resolution: 7.1, resolutionDelta: -1.2, escalations: 8, escalationsDelta: -4, health: 92 },
  'YTD': { tickets: 21044,ticketsDelta: 8.7,  sla: 94.6, slaDelta: 2.4,  consultants: 21, consultantsDelta: 5, resolution: 7.4, resolutionDelta: -1.6, escalations: 12, escalationsDelta: -7, health: 91 },
};

const TREND = [
  { d: 'Jun 02', created: 58, resolved: 51 }, { d: 'Jun 03', created: 64, resolved: 60 },
  { d: 'Jun 04', created: 49, resolved: 55 }, { d: 'Jun 05', created: 71, resolved: 63 },
  { d: 'Jun 08', created: 66, resolved: 69 }, { d: 'Jun 09', created: 73, resolved: 70 },
  { d: 'Jun 10', created: 60, resolved: 65 }, { d: 'Jun 11', created: 78, resolved: 72 },
  { d: 'Jun 12', created: 69, resolved: 74 }, { d: 'Jun 15', created: 81, resolved: 76 },
  { d: 'Jun 16', created: 74, resolved: 79 }, { d: 'Jun 17', created: 67, resolved: 71 },
  { d: 'Jun 18', created: 72, resolved: 75 }, { d: 'Jun 19', created: 63, resolved: 70 },
];

const MODULES = [
  { name: 'FICO', value: 412 }, { name: 'MM', value: 358 }, { name: 'SD', value: 296 },
  { name: 'ABAP', value: 241 }, { name: 'BASIS', value: 188 }, { name: 'SF EC', value: 143 },
];

const PRIORITY = [
  { name: 'Critical', value: 8,  color: 'var(--crit)' },
  { name: 'High',     value: 22, color: 'var(--warn)' },
  { name: 'Medium',   value: 41, color: 'var(--accent)' },
  { name: 'Low',      value: 29, color: 'var(--ink-3)' },
];

type Row = { name: string; module: string; type: 'Functional' | 'Technical'; active: number; resolved: number; util: number; sla: number; spark: number[]; status: 'On Track' | 'At Capacity' | 'Available' };
const CONSULTANTS: Row[] = [
  { name: 'Aarav Mehta',     module: 'FICO',  type: 'Functional', active: 12, resolved: 184, util: 92, sla: 98, status: 'At Capacity', spark: [4,6,5,7,8,7,9] },
  { name: 'Priya Nair',      module: 'SD',    type: 'Functional', active: 9,  resolved: 167, util: 78, sla: 97, status: 'On Track',    spark: [5,5,6,6,7,6,7] },
  { name: 'Rohan Iyer',      module: 'ABAP',  type: 'Technical',  active: 11, resolved: 151, util: 86, sla: 95, status: 'On Track',    spark: [3,4,5,6,6,7,8] },
  { name: 'Sara Khan',       module: 'MM',    type: 'Functional', active: 7,  resolved: 142, util: 64, sla: 99, status: 'Available',   spark: [6,5,5,4,5,5,6] },
  { name: 'Vikram Desai',    module: 'BASIS', type: 'Technical',  active: 10, resolved: 138, util: 81, sla: 94, status: 'On Track',    spark: [4,5,4,6,7,6,7] },
  { name: 'Ananya Rao',      module: 'SF EC', type: 'Functional', active: 6,  resolved: 121, util: 58, sla: 96, status: 'Available',   spark: [3,4,4,5,4,5,5] },
  { name: 'Karthik Subraman',module: 'FICO',  type: 'Technical',  active: 13, resolved: 119, util: 95, sla: 92, status: 'At Capacity', spark: [5,6,7,7,8,9,9] },
  { name: 'Meera Joshi',     module: 'SD',    type: 'Functional', active: 8,  resolved: 110, util: 71, sla: 98, status: 'On Track',    spark: [4,5,5,6,6,6,7] },
];

const HEALTH_FACTORS = [
  { label: 'SLA adherence', value: 96, tone: 'success' as const },
  { label: 'Backlog pressure', value: 78, tone: 'warn' as const },
  { label: 'Escalation rate', value: 91, tone: 'success' as const },
  { label: 'Capacity headroom', value: 73, tone: 'warn' as const },
];

/* ───────────────────────── tiny presentational primitives ──────────────────── */

function Delta({ v, invert = false, unit = '%' }: { v: number; invert?: boolean; unit?: string }) {
  const good = invert ? v < 0 : v > 0;
  const Icon = v >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`uilab-delta ${good ? 'is-good' : 'is-bad'}`}>
      <Icon size={12} strokeWidth={2.5} />
      {Math.abs(v)}{unit}
    </span>
  );
}

function Sparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  const w = 64, h = 22, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="uilab-spark" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Gauge({ score }: { score: number }) {
  const size = 184, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;
  const tone = pct >= 90 ? 'var(--success)' : pct >= 75 ? 'var(--warn)' : 'var(--crit)';
  return (
    <div className="uilab-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="uilab-gauge-center">
        <span className="uilab-gauge-score">{score}</span>
        <span className="uilab-gauge-unit">/ 100</span>
        <span className="uilab-gauge-label">System health</span>
      </div>
    </div>
  );
}

function Bullet({ label, value, max, sub }: { label: string; value: number; max: number; sub: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const tone = pct > 90 ? 'var(--crit)' : pct >= 75 ? 'var(--warn)' : 'var(--accent)';
  return (
    <div className="uilab-bullet">
      <div className="uilab-bullet-head">
        <span className="uilab-bullet-name">{label}</span>
        <span className="uilab-bullet-sub">{sub}</span>
      </div>
      <div className="uilab-bullet-track">
        <div className="uilab-bullet-target" style={{ left: '100%' }} />
        <div className="uilab-bullet-fill" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

const STATUS_TONE: Record<Row['status'], string> = {
  'On Track': 'ok', 'At Capacity': 'crit', 'Available': 'muted',
};

/* ───────────────────────────────── page ────────────────────────────────────── */

export default function UiLabPage() {
  const [period, setPeriod] = useState<Period>('30D');
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof Row>('util');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [query, setQuery] = useState('');

  // Simulate an initial fetch so loading/skeleton states are visible.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [period]);

  const k = KPI_BY_PERIOD[period];

  const rows = useMemo(() => {
    const filtered = CONSULTANTS.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase()) || r.module.toLowerCase().includes(query.toLowerCase()));
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [sortKey, sortDir, query]);

  const toggleSort = (key: keyof Row) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const kpis = [
    { label: 'Total Tickets', value: k.tickets.toLocaleString(), delta: k.ticketsDelta, invert: false, icon: Activity, sub: 'across all client desks' },
    { label: 'SLA Compliance', value: `${k.sla}%`, delta: k.slaDelta, invert: false, icon: ShieldCheck, sub: 'vs. contracted targets', bar: k.sla },
    { label: 'Active Consultants', value: String(k.consultants), delta: k.consultantsDelta, invert: false, icon: Users, unit: '', sub: 'staffed this period' },
    { label: 'Avg Resolution', value: `${k.resolution}h`, delta: k.resolutionDelta, invert: true, icon: Timer, unit: 'h', sub: 'business-hours to close' },
    { label: 'Open Escalations', value: String(k.escalations), delta: k.escalationsDelta, invert: true, icon: AlertTriangle, unit: '', sub: 'awaiting acknowledgement' },
  ];

  return (
    <div className="uilab">
      <style>{CSS}</style>

      {/* ── command bar ─────────────────────────────────────────────── */}
      <header className="uilab-bar">
        <div className="uilab-bar-titles">
          <div className="uilab-eyebrow"><Sparkles size={13} strokeWidth={2} /> UI Lab · evaluation sandbox</div>
          <h1 className="uilab-h1">Operations Command Center</h1>
          <p className="uilab-sub">Live posture across consultants, SLAs, and client delivery — one pane of glass.</p>
        </div>
        <div className="uilab-bar-actions">
          <div className="uilab-seg" role="tablist" aria-label="Reporting period">
            {PERIODS.map(p => (
              <button key={p} role="tab" aria-selected={period === p}
                className={`uilab-seg-btn ${period === p ? 'is-active' : ''}`} onClick={() => setPeriod(p)}>
                {p}
              </button>
            ))}
          </div>
          <button className="uilab-btn uilab-btn-ghost"><RefreshCw size={14} /> Refresh</button>
          <button className="uilab-btn uilab-btn-primary"><Download size={14} /> Export</button>
        </div>
      </header>

      {/* ── KPI row ─────────────────────────────────────────────────── */}
      <section className="uilab-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className="uilab-card uilab-kpi">
              <div className="uilab-kpi-top">
                <span className="uilab-kpi-label">{kpi.label}</span>
                <span className="uilab-kpi-icon"><Icon size={15} strokeWidth={2} /></span>
              </div>
              {loading ? <div className="uilab-skel uilab-skel-val" /> : (
                <div className="uilab-kpi-value">{kpi.value}</div>
              )}
              <div className="uilab-kpi-foot">
                <Delta v={kpi.delta} invert={kpi.invert} unit={kpi.unit ?? '%'} />
                <span className="uilab-kpi-sub">{kpi.sub}</span>
              </div>
              {kpi.bar != null && <div className="uilab-kpi-bar"><div style={{ width: `${kpi.bar}%` }} /></div>}
            </article>
          );
        })}
      </section>

      {/* ── health hero + trend ─────────────────────────────────────── */}
      <section className="uilab-grid-2">
        <article className="uilab-card uilab-health">
          <div className="uilab-card-head">
            <div><h3 className="uilab-card-title">System Health</h3><p className="uilab-card-desc">Composite of SLA, backlog, escalation & capacity signals.</p></div>
          </div>
          <div className="uilab-health-body">
            <Gauge score={k.health} />
            <div className="uilab-factors">
              {HEALTH_FACTORS.map(f => (
                <div key={f.label} className="uilab-factor">
                  <div className="uilab-factor-head"><span>{f.label}</span><span className="uilab-factor-val">{f.value}</span></div>
                  <div className="uilab-factor-track"><div className={`uilab-factor-fill is-${f.tone}`} style={{ width: `${f.value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="uilab-card">
          <div className="uilab-card-head">
            <div><h3 className="uilab-card-title">Ticket Flow</h3><p className="uilab-card-desc">Created vs. resolved · trailing window.</p></div>
            <div className="uilab-legend">
              <span><i style={{ background: 'var(--accent)' }} /> Created</span>
              <span><i style={{ background: 'var(--success)' }} /> Resolved</span>
            </div>
          </div>
          <div className="uilab-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip contentStyle={TIP} cursor={{ stroke: 'var(--line-2)' }} />
                <Area type="monotone" dataKey="created" stroke="var(--accent)" strokeWidth={2} fill="url(#gCreated)" dot={false} activeDot={{ r: 3 }} />
                <Area type="monotone" dataKey="resolved" stroke="var(--success)" strokeWidth={2} fill="url(#gResolved)" dot={false} activeDot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* ── breakdown + distribution + escalations(empty) ───────────── */}
      <section className="uilab-grid-3">
        <article className="uilab-card">
          <div className="uilab-card-head"><div><h3 className="uilab-card-title">Volume by Module</h3><p className="uilab-card-desc">Where the work concentrates.</p></div></div>
          <div className="uilab-chart uilab-chart-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODULES} layout="vertical" margin={{ top: 2, right: 12, left: 6, bottom: 2 }}>
                <CartesianGrid stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--ink-2)', fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--panel-2)' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="uilab-card">
          <div className="uilab-card-head"><div><h3 className="uilab-card-title">Priority Mix</h3><p className="uilab-card-desc">Share of open incidents.</p></div></div>
          <div className="uilab-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PRIORITY} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
                  {PRIORITY.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip contentStyle={TIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="uilab-donut-legend">
              {PRIORITY.map(p => (
                <div key={p.name} className="uilab-donut-li"><i style={{ background: p.color }} /><span>{p.name}</span><b>{p.value}%</b></div>
              ))}
            </div>
          </div>
        </article>

        <article className="uilab-card">
          <div className="uilab-card-head"><div><h3 className="uilab-card-title">Recent Escalations</h3><p className="uilab-card-desc">Awaiting manager acknowledgement.</p></div></div>
          <div className="uilab-empty">
            <div className="uilab-empty-badge"><ShieldCheck size={18} /></div>
            <p className="uilab-empty-title">All clear</p>
            <p className="uilab-empty-sub">No unacknowledged escalations in this window. New events surface here in real time.</p>
          </div>
        </article>
      </section>

      {/* ── consultant table + workload ─────────────────────────────── */}
      <section className="uilab-grid-table">
        <article className="uilab-card uilab-table-card">
          <div className="uilab-card-head">
            <div><h3 className="uilab-card-title">Consultant Performance</h3><p className="uilab-card-desc">Sortable · utilization and SLA adherence per consultant.</p></div>
            <div className="uilab-search">
              <Search size={14} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter consultants…" aria-label="Filter consultants" />
            </div>
          </div>
          <div className="uilab-table-wrap">
            <table className="uilab-table">
              <thead>
                <tr>
                  <Th label="Consultant" k="name" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Module" k="module" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Active" k="active" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="Resolved" k="resolved" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="uilab-th">7-day</th>
                  <Th label="Utilization" k="util" {...{ sortKey, sortDir, toggleSort }} />
                  <Th label="SLA" k="sla" align="right" {...{ sortKey, sortDir, toggleSort }} />
                  <th className="uilab-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="uilab-skel uilab-skel-row" /></td></tr>
                )) : rows.length === 0 ? (
                  <tr><td colSpan={8}><div className="uilab-empty uilab-empty-sm"><p className="uilab-empty-title">No matches</p><p className="uilab-empty-sub">Adjust the filter to see consultants.</p></div></td></tr>
                ) : rows.map(r => (
                  <tr key={r.name}>
                    <td>
                      <div className="uilab-person">
                        <span className="uilab-avatar">{r.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                        <div><div className="uilab-person-name">{r.name}</div><div className="uilab-person-meta">{r.type}</div></div>
                      </div>
                    </td>
                    <td><span className="uilab-chip">{r.module}</span></td>
                    <td className="uilab-num">{r.active}</td>
                    <td className="uilab-num">{r.resolved}</td>
                    <td><Sparkline data={r.spark} color={r.util > 90 ? 'var(--crit)' : 'var(--accent)'} /></td>
                    <td>
                      <div className="uilab-util">
                        <div className="uilab-util-track"><div style={{ width: `${r.util}%`, background: r.util > 90 ? 'var(--crit)' : r.util >= 75 ? 'var(--warn)' : 'var(--accent)' }} /></div>
                        <span className="uilab-num">{r.util}%</span>
                      </div>
                    </td>
                    <td className="uilab-num">{r.sla}%</td>
                    <td><span className={`uilab-pill is-${STATUS_TONE[r.status]}`}><Circle size={7} /> {r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="uilab-card">
          <div className="uilab-card-head"><div><h3 className="uilab-card-title">Workload Balance</h3><p className="uilab-card-desc">Active load vs. weekly capacity (45h).</p></div></div>
          <div className="uilab-bullets">
            {(loading ? [] : CONSULTANTS.slice(0, 6)).map(r => (
              <Bullet key={r.name} label={r.name} value={r.util * 0.45} max={45} sub={`${Math.round(r.util * 0.45)}h / 45h`} />
            ))}
            {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="uilab-skel uilab-skel-bullet" />)}
          </div>
        </article>
      </section>

      <footer className="uilab-foot">Sample data · isolated evaluation surface · no production data touched.</footer>
    </div>
  );
}

/* ── sortable header cell ─────────────────────────────────────────── */
function Th({ label, k, align, sortKey, sortDir, toggleSort }: {
  label: string; k: keyof Row; align?: 'right';
  sortKey: keyof Row; sortDir: 'asc' | 'desc'; toggleSort: (k: keyof Row) => void;
}) {
  const active = sortKey === k;
  return (
    <th className={`uilab-th uilab-th-sort ${align === 'right' ? 'is-right' : ''} ${active ? 'is-active' : ''}`} onClick={() => toggleSort(k)}>
      <span>{label}<ChevronsUpDown size={12} className="uilab-th-caret" /></span>
    </th>
  );
}

const TIP: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 10,
  boxShadow: '0 8px 28px -12px rgba(15,17,21,.25)', fontSize: 12, color: 'var(--ink)', padding: '8px 10px',
};

/* ───────────────────────── scoped design tokens + styles ───────────────────── */
const CSS = `
.uilab {
  --bg:#FAFAFB; --panel:#FFFFFF; --panel-2:#F6F7F9;
  --ink:#0E1116; --ink-2:#565B64; --ink-3:#9AA0AA;
  --line:#EEEFF2; --line-2:#E2E4E9;
  --accent:#2F6BFF; --accent-ink:#1C4AE6;
  --success:#127A4E; --warn:#B9740D; --crit:#CF3A29;
  --radius:14px; --shadow:0 1px 2px rgba(15,17,21,.04), 0 8px 24px -16px rgba(15,17,21,.18);
  color:var(--ink);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased; letter-spacing:-0.01em;
  display:flex; flex-direction:column; gap:18px;
}
.uilab *{box-sizing:border-box;}
.uilab .uilab-num{font-variant-numeric:tabular-nums;}

/* command bar */
.uilab-bar{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;}
.uilab-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:8px;}
.uilab-h1{font-size:24px;font-weight:680;line-height:1.1;margin:0;letter-spacing:-0.025em;}
.uilab-sub{margin:6px 0 0;font-size:13.5px;color:var(--ink-2);}
.uilab-bar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.uilab-seg{display:inline-flex;background:var(--panel-2);border:1px solid var(--line-2);border-radius:10px;padding:3px;}
.uilab-seg-btn{border:0;background:transparent;color:var(--ink-2);font-size:12.5px;font-weight:560;padding:6px 12px;border-radius:7px;cursor:pointer;transition:all .15s;}
.uilab-seg-btn:hover{color:var(--ink);}
.uilab-seg-btn.is-active{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(15,17,21,.08);}
.uilab-btn{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:560;padding:8px 13px;border-radius:9px;cursor:pointer;transition:all .15s;border:1px solid transparent;}
.uilab-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.uilab-btn-ghost{background:var(--panel);border-color:var(--line-2);color:var(--ink-2);}
.uilab-btn-ghost:hover{color:var(--ink);border-color:var(--ink-3);}
.uilab-btn-primary{background:var(--ink);color:#fff;}
.uilab-btn-primary:hover{background:#23272F;}

/* card shell */
.uilab-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;}
.uilab-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
.uilab-card-title{font-size:14px;font-weight:640;margin:0;letter-spacing:-0.01em;}
.uilab-card-desc{font-size:12px;color:var(--ink-3);margin:3px 0 0;}

/* KPI */
.uilab-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
.uilab-kpi{display:flex;flex-direction:column;gap:10px;transition:border-color .15s, box-shadow .15s;}
.uilab-kpi:hover{border-color:var(--line-2);box-shadow:0 1px 2px rgba(15,17,21,.05),0 14px 30px -20px rgba(15,17,21,.28);}
.uilab-kpi-top{display:flex;justify-content:space-between;align-items:center;}
.uilab-kpi-label{font-size:12px;font-weight:560;color:var(--ink-2);}
.uilab-kpi-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--panel-2);color:var(--ink-2);}
.uilab-kpi-value{font-size:27px;font-weight:680;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;}
.uilab-kpi-foot{display:flex;align-items:center;gap:8px;}
.uilab-kpi-sub{font-size:11.5px;color:var(--ink-3);}
.uilab-delta{display:inline-flex;align-items:center;gap:2px;font-size:11.5px;font-weight:620;padding:2px 6px;border-radius:6px;}
.uilab-delta.is-good{color:var(--success);background:rgba(18,122,78,.09);}
.uilab-delta.is-bad{color:var(--crit);background:rgba(207,58,41,.09);}
.uilab-kpi-bar{height:4px;border-radius:99px;background:var(--line);overflow:hidden;}
.uilab-kpi-bar>div{height:100%;background:var(--accent);border-radius:99px;transition:width .6s cubic-bezier(.22,1,.36,1);}

/* layout grids */
.uilab-grid-2{display:grid;grid-template-columns:380px 1fr;gap:14px;}
.uilab-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.uilab-grid-table{display:grid;grid-template-columns:1fr 320px;gap:14px;}

/* health */
.uilab-health-body{display:flex;flex-direction:column;align-items:center;gap:18px;}
.uilab-gauge{position:relative;display:grid;place-items:center;}
.uilab-gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;}
.uilab-gauge-score{font-size:38px;font-weight:700;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;}
.uilab-gauge-unit{font-size:12px;color:var(--ink-3);margin-top:2px;}
.uilab-gauge-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);margin-top:6px;font-weight:600;}
.uilab-factors{width:100%;display:flex;flex-direction:column;gap:11px;}
.uilab-factor-head{display:flex;justify-content:space-between;font-size:12px;color:var(--ink-2);margin-bottom:5px;}
.uilab-factor-val{font-weight:620;color:var(--ink);font-variant-numeric:tabular-nums;}
.uilab-factor-track{height:6px;border-radius:99px;background:var(--line);overflow:hidden;}
.uilab-factor-fill{height:100%;border-radius:99px;}
.uilab-factor-fill.is-success{background:var(--success);}
.uilab-factor-fill.is-warn{background:var(--warn);}

/* charts */
.uilab-chart{height:240px;margin:0 -4px;}
.uilab-chart-sm{height:200px;}
.uilab-legend{display:flex;gap:14px;font-size:11.5px;color:var(--ink-2);}
.uilab-legend span{display:inline-flex;align-items:center;gap:6px;}
.uilab-legend i{width:9px;height:9px;border-radius:3px;display:inline-block;}
.uilab-donut{height:200px;display:grid;grid-template-columns:1fr 130px;align-items:center;}
.uilab-donut-legend{display:flex;flex-direction:column;gap:9px;}
.uilab-donut-li{display:grid;grid-template-columns:10px 1fr auto;align-items:center;gap:8px;font-size:12px;color:var(--ink-2);}
.uilab-donut-li i{width:9px;height:9px;border-radius:3px;}
.uilab-donut-li b{color:var(--ink);font-variant-numeric:tabular-nums;}

/* empty state */
.uilab-empty{display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;padding:26px 14px;gap:7px;min-height:200px;}
.uilab-empty-sm{min-height:120px;padding:18px;}
.uilab-empty-badge{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(18,122,78,.1);color:var(--success);margin-bottom:4px;}
.uilab-empty-title{font-size:13.5px;font-weight:620;margin:0;}
.uilab-empty-sub{font-size:12px;color:var(--ink-3);margin:0;max-width:240px;line-height:1.5;}

/* table */
.uilab-table-wrap{overflow-x:auto;margin:0 -18px -18px;}
.uilab-table{width:100%;border-collapse:collapse;font-size:13px;}
.uilab-th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);padding:9px 14px;border-bottom:1px solid var(--line);white-space:nowrap;}
.uilab-th.is-right,.uilab-table td.uilab-num{text-align:right;}
.uilab-th-sort{cursor:pointer;user-select:none;}
.uilab-th-sort>span{display:inline-flex;align-items:center;gap:3px;}
.uilab-th-sort.is-right>span{flex-direction:row-reverse;}
.uilab-th-caret{opacity:.35;transition:opacity .15s;}
.uilab-th-sort:hover .uilab-th-caret{opacity:.7;}
.uilab-th-sort.is-active{color:var(--ink);}
.uilab-th-sort.is-active .uilab-th-caret{opacity:1;color:var(--accent);}
.uilab-table td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle;}
.uilab-table tbody tr{transition:background .12s;}
.uilab-table tbody tr:hover{background:var(--panel-2);}
.uilab-table tbody tr:last-child td{border-bottom:0;}
.uilab-person{display:flex;align-items:center;gap:10px;}
.uilab-avatar{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:640;background:var(--panel-2);color:var(--ink-2);border:1px solid var(--line-2);}
.uilab-person-name{font-weight:580;font-size:13px;}
.uilab-person-meta{font-size:11px;color:var(--ink-3);}
.uilab-chip{display:inline-block;font-size:11px;font-weight:560;padding:2px 8px;border-radius:6px;background:var(--panel-2);border:1px solid var(--line-2);color:var(--ink-2);}
.uilab-spark{display:block;}
.uilab-util{display:flex;align-items:center;gap:9px;min-width:120px;}
.uilab-util-track{flex:1;height:6px;border-radius:99px;background:var(--line);overflow:hidden;}
.uilab-util-track>div{height:100%;border-radius:99px;transition:width .5s;}
.uilab-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:560;padding:3px 9px;border-radius:99px;white-space:nowrap;}
.uilab-pill svg{margin-top:0;}
.uilab-pill.is-ok{background:rgba(18,122,78,.1);color:var(--success);}
.uilab-pill.is-ok svg{fill:var(--success);}
.uilab-pill.is-crit{background:rgba(207,58,41,.1);color:var(--crit);}
.uilab-pill.is-crit svg{fill:var(--crit);}
.uilab-pill.is-muted{background:var(--panel-2);color:var(--ink-2);}
.uilab-pill.is-muted svg{fill:var(--ink-3);}
.uilab-search{display:flex;align-items:center;gap:7px;background:var(--panel-2);border:1px solid var(--line-2);border-radius:9px;padding:6px 10px;color:var(--ink-3);}
.uilab-search input{border:0;background:transparent;outline:none;font-size:12.5px;color:var(--ink);width:150px;}
.uilab-search:focus-within{border-color:var(--accent);}

/* workload bullets */
.uilab-bullets{display:flex;flex-direction:column;gap:14px;}
.uilab-bullet-head{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;}
.uilab-bullet-name{font-weight:560;color:var(--ink);}
.uilab-bullet-sub{color:var(--ink-3);font-variant-numeric:tabular-nums;}
.uilab-bullet-track{position:relative;height:7px;border-radius:99px;background:var(--line);overflow:visible;}
.uilab-bullet-fill{height:100%;border-radius:99px;transition:width .5s;}
.uilab-bullet-target{position:absolute;top:-3px;width:2px;height:13px;background:var(--ink-3);opacity:.5;transform:translateX(-1px);}

/* skeletons */
.uilab-skel{position:relative;overflow:hidden;background:var(--line);border-radius:8px;}
.uilab-skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:uilab-shimmer 1.3s infinite;}
.uilab-skel-val{height:27px;width:70%;}
.uilab-skel-row{height:34px;width:100%;margin:4px 0;}
.uilab-skel-bullet{height:26px;width:100%;}
@keyframes uilab-shimmer{100%{transform:translateX(100%);}}

.uilab-foot{font-size:11.5px;color:var(--ink-3);text-align:center;padding:4px 0 8px;}

/* responsive */
@media (max-width:1180px){
  .uilab-kpis{grid-template-columns:repeat(3,1fr);}
  .uilab-grid-2,.uilab-grid-table{grid-template-columns:1fr;}
  .uilab-grid-3{grid-template-columns:1fr;}
}
@media (max-width:640px){
  .uilab-kpis{grid-template-columns:repeat(2,1fr);}
  .uilab-bar-actions{width:100%;}
}
`;
