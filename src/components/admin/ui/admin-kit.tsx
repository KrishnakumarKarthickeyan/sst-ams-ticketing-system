'use client';

/**
 * SuperAdmin design-system kit — the reusable components every admin screen uses.
 *
 * APPLIED FROM THE SKILL (ui-ux-pro-max): "Data-Dense Dashboard" style (KPI cards +
 * charts + tables, space-efficient grid); B2B navy/blue palette; bullet charts for
 * KPI-vs-target with always-visible values; subtle gridlines; 150–300ms hover/focus
 * motion; tabular numerals for data; accessible focus rings; graceful empty/loading.
 *
 * SCOPE: every style here is nested under `.admin-shell` (injected once by
 * <AdminThemeStyle/> from src/app/admin/layout.tsx). Nothing matches outside admin,
 * so Manager/Consultant/Customer surfaces are visually untouched. Deleting
 * src/components/admin/** + reverting the admin layout restores the app exactly.
 */

import React, { useMemo, useState } from 'react';
import { SEVERITY } from './admin-theme';
import { ChevronsUpDown, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/* ───────────────────────────── shell + header ─────────────────────────────── */

export function AdminPageHeader({
  eyebrow, title, subtitle, actions,
}: { eyebrow?: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="ak-bar">
      <div className="ak-bar-titles">
        {eyebrow && <div className="ak-eyebrow">{eyebrow}</div>}
        <h1 className="ak-h1">{title}</h1>
        {subtitle && <p className="ak-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ak-bar-actions">{actions}</div>}
    </header>
  );
}

export function AdminSegmented<T extends string>({
  options, value, onChange, ariaLabel,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; ariaLabel?: string }) {
  return (
    <div className="ak-seg" role="tablist" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o} role="tab" aria-selected={value === o}
          className={`ak-seg-btn ${value === o ? 'is-active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

export function AdminButton({
  children, variant = 'ghost', onClick, type = 'button', disabled,
}: { children: React.ReactNode; variant?: 'primary' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`ak-btn ak-btn-${variant}`}>{children}</button>
  );
}

/* ───────────────────────────────── card ───────────────────────────────────── */

export function AdminCard({
  title, desc, actions, className, children, pad = true,
}: { title?: string; desc?: string; actions?: React.ReactNode; className?: string; children: React.ReactNode; pad?: boolean }) {
  return (
    <section className={`ak-card ${pad ? '' : 'ak-card-flush'} ${className ?? ''}`}>
      {(title || actions) && (
        <div className="ak-card-head">
          <div>{title && <h3 className="ak-card-title">{title}</h3>}{desc && <p className="ak-card-desc">{desc}</p>}</div>
          {actions && <div className="ak-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ─────────────────────────────── KPI stat ─────────────────────────────────── */

export function AdminStat({
  label, value, delta, deltaUnit = '%', invertDelta = false, icon, sub, progress, loading, tone = 'neutral',
}: {
  label: string; value: React.ReactNode; delta?: number; deltaUnit?: string; invertDelta?: boolean;
  icon?: React.ReactNode; sub?: string; progress?: number; loading?: boolean;
  tone?: 'neutral' | 'success' | 'warning' | 'critical';
}) {
  const good = delta == null ? false : invertDelta ? delta < 0 : delta > 0;
  const DeltaIcon = (delta ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <article className={`ak-card ak-stat ak-tone-${tone}`}>
      <div className="ak-stat-top">
        <span className="ak-stat-label">{label}</span>
        {icon && <span className="ak-stat-icon">{icon}</span>}
      </div>
      {loading ? <div className="ak-skel ak-skel-val" /> : <div className="ak-stat-value">{value}</div>}
      <div className="ak-stat-foot">
        {delta != null && (
          <span className={`ak-delta ${good ? 'is-good' : 'is-bad'}`}>
            <DeltaIcon size={12} strokeWidth={2.5} />{Math.abs(delta)}{deltaUnit}
          </span>
        )}
        {sub && <span className="ak-stat-sub">{sub}</span>}
      </div>
      {progress != null && <div className="ak-stat-bar"><div style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>}
    </article>
  );
}

/* ─────────────────────────────── gauge ────────────────────────────────────── */

export function AdminGauge({ score, label, suffix = '/ 100', size = 176 }: { score: number; label: string; suffix?: string; size?: number }) {
  const stroke = Math.round(size * 0.075), r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const tone = pct >= 90 ? 'var(--ak-success)' : pct >= 75 ? 'var(--ak-warning)' : 'var(--ak-critical)';
  return (
    <div className="ak-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ak-line2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`}
          style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="ak-gauge-center">
        <span className="ak-gauge-score">{score}</span>
        <span className="ak-gauge-unit">{suffix}</span>
        <span className="ak-gauge-label">{label}</span>
      </div>
    </div>
  );
}

/* ───────────────────────────── sparkline ──────────────────────────────────── */

export function AdminSparkline({ data, color = 'var(--ak-accent)', w = 64, h = 22 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data.length) return <span className="ak-muted">—</span>;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return <svg width={w} height={h} className="ak-spark" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ─────────────────────── signal (hero KPI with trend) ─────────────────────── */

/**
 * Flagship KPI tile: dominant value, period-over-period delta chip, and a filled
 * area sparkline of the in-period daily trend. Used for the 4 lead cockpit metrics
 * that deserve visual weight over the uniform secondary strip.
 */
export function AdminSignal({
  label, value, delta, invertDelta = false, series = [], tone = 'neutral', sub, icon, footNote,
}: {
  label: string; value: React.ReactNode; delta?: number; invertDelta?: boolean;
  series?: number[]; tone?: 'neutral' | 'success' | 'warning' | 'critical';
  sub?: string; icon?: React.ReactNode; footNote?: React.ReactNode;
}) {
  const good = delta == null ? false : invertDelta ? delta <= 0 : delta >= 0;
  const DeltaIcon = (delta ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  const accent = tone === 'critical' ? 'var(--ak-critical)'
    : tone === 'warning' ? 'var(--ak-warning)'
    : tone === 'success' ? 'var(--ak-success)' : 'var(--ak-accent)';
  const w = 260, h = 48;
  const data = series.length ? series : [0, 0];
  const max = Math.max(...data), min = Math.min(...data);
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 7) - 4;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gid = React.useId().replace(/:/g, '');
  return (
    <article className={`ak-card ak-signal ak-tone-${tone}`}>
      <span className="ak-signal-rail" style={{ background: accent }} aria-hidden />
      <div className="ak-signal-head">
        <span className="ak-signal-label">{label}</span>
        {icon && <span className="ak-stat-icon">{icon}</span>}
      </div>
      <div className="ak-signal-value">{value}</div>
      <div className="ak-stat-foot">
        {delta != null && (
          <span className={`ak-delta ${good ? 'is-good' : 'is-bad'}`}>
            <DeltaIcon size={12} strokeWidth={2.5} />{Math.abs(delta)}%
          </span>
        )}
        {sub && <span className="ak-stat-sub">{sub}</span>}
      </div>
      <svg className="ak-signal-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`sg-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.20" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#sg-${gid})`} />
        <path d={line} fill="none" stroke={accent} strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {footNote && <span className="ak-signal-foot">{footNote}</span>}
    </article>
  );
}

/* ─────────────────────── bullet (utilization) row ─────────────────────────── */

export function AdminBullet({ label, value, max, valueText, target = 100 }: { label: string; value: number; max: number; valueText?: string; target?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const tone = pct > 90 ? 'var(--ak-critical)' : pct >= 75 ? 'var(--ak-warning)' : 'var(--ak-accent)';
  return (
    <div className="ak-bullet">
      <div className="ak-bullet-head"><span className="ak-bullet-name">{label}</span><span className="ak-bullet-sub">{valueText ?? `${Math.round(value)} / ${max}`}</span></div>
      <div className="ak-bullet-track">
        <div className="ak-bullet-target" style={{ left: `${Math.min(100, target)}%` }} />
        <div className="ak-bullet-fill" style={{ width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
}

/* ─────────────── ranked bar list (dense, gap-free at any count) ───────────── */

export function AdminBarList({
  data, color = 'var(--ak-accent)', valueSuffix = '', max, emptyLabel = 'No data',
}: {
  data: { name: string; value: number; color?: string }[];
  color?: string; valueSuffix?: string; max?: number; emptyLabel?: string;
}) {
  if (!data.length) return <AdminEmpty small title={emptyLabel} sub="Nothing to rank in this view." />;
  const peak = max ?? Math.max(1, ...data.map(d => d.value));
  return (
    <div className="ak-barlist">
      {data.map(d => (
        <div key={d.name} className="ak-barlist-row">
          <span className="ak-barlist-label" title={d.name}>{d.name}</span>
          <div className="ak-barlist-track">
            <div className="ak-barlist-fill" style={{ width: `${Math.max(2, (d.value / peak) * 100)}%`, background: d.color ?? color }} />
          </div>
          <span className="ak-barlist-val ak-num">{d.value}{valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────── load buckets (distribution bar) ──────────────────────── */

export function AdminLoadBuckets({ buckets }: { buckets: { label: string; count: number; tone: 'idle' | 'healthy' | 'busy' | 'over' }[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <div className="ak-buckets">
      <div className="ak-buckets-bar">
        {buckets.map(b => b.count > 0 && (
          <div key={b.label} className={`ak-bucket-seg is-${b.tone}`} style={{ width: `${(b.count / total) * 100}%` }} title={`${b.label}: ${b.count}`} />
        ))}
      </div>
      <div className="ak-buckets-legend">
        {buckets.map(b => (
          <div key={b.label} className="ak-bucket-li"><i className={`is-${b.tone}`} /><span>{b.label}</span><b>{b.count}</b></div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── status pill ──────────────────────────────────── */

export function AdminPill({ tone, children }: { tone: 'ok' | 'warn' | 'crit' | 'muted' | 'info'; children: React.ReactNode }) {
  return <span className={`ak-pill is-${tone}`}><svg width="7" height="7" viewBox="0 0 7 7" aria-hidden><circle cx="3.5" cy="3.5" r="3.5" /></svg>{children}</span>;
}

export function SeverityPill({ level }: { level: 'Critical' | 'High' | 'Medium' | 'Low' }) {
  return <span className="ak-sev" style={{ color: SEVERITY[level], background: `${SEVERITY[level]}15` }}><svg width="7" height="7" viewBox="0 0 7 7" aria-hidden><circle cx="3.5" cy="3.5" r="3.5" fill={SEVERITY[level]} /></svg>{level}</span>;
}

/* ─────────────────────────── empty state ──────────────────────────────────── */

export function AdminEmpty({ icon, title, sub, small }: { icon?: React.ReactNode; title: string; sub?: string; small?: boolean }) {
  return (
    <div className={`ak-empty ${small ? 'ak-empty-sm' : ''}`}>
      {icon && <div className="ak-empty-badge">{icon}</div>}
      <p className="ak-empty-title">{title}</p>
      {sub && <p className="ak-empty-sub">{sub}</p>}
    </div>
  );
}

/* ─────────────────── generic sortable data table (top-N + pages) ──────────── */

export interface AdminColumn<T> {
  key: string; header: string; align?: 'right' | 'center';
  sortValue?: (row: T) => number | string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

export function AdminDataTable<T>({
  rows, columns, pageSize = 8, getRowKey, empty, loading, initialSort,
}: {
  rows: T[]; columns: AdminColumn<T>[]; pageSize?: number; getRowKey: (row: T, i: number) => string;
  empty?: React.ReactNode; loading?: boolean; initialSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [dir, setDir] = useState<'asc' | 'desc'>(initialSort?.dir ?? 'desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = columns.find(c => c.key === sortKey);
    if (!col || !col.sortValue) return rows;
    const out = [...rows].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, columns, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggle = (key: string, sortable: boolean) => {
    if (!sortable) return;
    if (key === sortKey) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setDir('desc'); }
    setPage(0);
  };

  return (
    <div className="ak-table-wrap">
      <table className="ak-table">
        <thead>
          <tr>
            {columns.map(c => {
              const sortable = !!c.sortValue;
              const active = sortKey === c.key;
              return (
                <th key={c.key} style={{ width: c.width }}
                  className={`ak-th ${c.align === 'right' ? 'is-right' : c.align === 'center' ? 'is-center' : ''} ${sortable ? 'ak-th-sort' : ''} ${active ? 'is-active' : ''}`}
                  onClick={() => toggle(c.key, sortable)} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <span>{c.header}{sortable && <ChevronsUpDown size={12} className="ak-th-caret" />}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: Math.min(6, pageSize) }).map((_, i) => (
            <tr key={i}><td colSpan={columns.length}><div className="ak-skel ak-skel-row" /></td></tr>
          )) : pageRows.length === 0 ? (
            <tr><td colSpan={columns.length}>{empty ?? <AdminEmpty small title="No data" sub="Nothing to show in this view." />}</td></tr>
          ) : pageRows.map((row, i) => (
            <tr key={getRowKey(row, i)}>
              {columns.map(c => <td key={c.key} className={c.align === 'right' ? 'ak-num' : c.align === 'center' ? 'ak-center' : ''}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {pageCount > 1 && (
        <div className="ak-pager">
          <span className="ak-pager-info">{safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {sorted.length}</span>
          <div className="ak-pager-btns">
            <button className="ak-pager-btn" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))} aria-label="Previous page"><ChevronLeft size={15} /></button>
            <button className="ak-pager-btn" disabled={safePage >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── grid helpers ───────────────────────────────────── */

export const AdminGrid = ({ cols, children, className }: { cols: 2 | 3 | 4 | 5; children: React.ReactNode; className?: string }) =>
  <div className={`ak-grid ak-grid-${cols} ${className ?? ''}`}>{children}</div>;

/* ───────────────────── scoped theme stylesheet (once) ─────────────────────── */

export function AdminThemeStyle() {
  return <style>{AK_CSS}</style>;
}

const AK_CSS = `
.admin-shell{
  /* Re-theme the app's shared Tailwind tokens for SuperAdmin ONLY (scoped — no bleed).
     Every app component used inside admin (Card, Table, Button, badges, PageHeader…)
     reads these var()s, so overriding them here shifts the whole admin surface to the
     cohesive navy/blue enterprise palette without editing each screen. */
  --color-ink:#0F172A; --color-ink-secondary:#475569; --color-ink-muted:#8A93A3;
  --color-line:#E7EAF0; --color-line-strong:#DCE0E8;
  --color-surface:#FFFFFF; --color-surface-muted:#F6F8FB; --color-surface-subtle:#EEF2F7;
  --color-brand:#0E63C9; --color-brand-strong:#0B4DA0; --color-brand-soft:#EAF1FC; --color-brand-border:#C7DBF6;
  background:#F7F9FC;

  --ak-ink:#0F172A; --ak-ink2:#475569; --ak-ink3:#8A93A3;
  --ak-line:#E7EAF0; --ak-line2:#DCE0E8; --ak-panel:#FFFFFF; --ak-panel2:#F6F8FB; --ak-bg:#F7F9FC;
  --ak-accent:#0E63C9; --ak-accent-ink:#0B4DA0; --ak-amber:#C2730C;
  --ak-success:#0F7A4F; --ak-warning:#B8690C; --ak-critical:#C5392B;
  --ak-radius:14px; --ak-shadow:0 1px 2px rgba(15,23,42,.04),0 10px 26px -18px rgba(15,23,42,.20);
  color:var(--ak-ink);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased; letter-spacing:-0.01em;
}
.admin-shell .ak-num,.admin-shell [class*="ak-"] .ak-num{font-variant-numeric:tabular-nums;}
.admin-shell .ak-muted{color:var(--ak-ink3);}

/* header */
.admin-shell .ak-bar{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;}
.admin-shell .ak-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ak-accent);margin-bottom:8px;}
.admin-shell .ak-h1{font-size:23px;font-weight:680;line-height:1.1;margin:0;letter-spacing:-0.025em;color:var(--ak-ink);}
.admin-shell .ak-sub{margin:6px 0 0;font-size:13px;color:var(--ak-ink2);}
.admin-shell .ak-bar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.admin-shell .ak-seg{display:inline-flex;background:var(--ak-panel2);border:1px solid var(--ak-line2);border-radius:10px;padding:3px;}
.admin-shell .ak-seg-btn{border:0;background:transparent;color:var(--ak-ink2);font-size:12.5px;font-weight:560;padding:6px 12px;border-radius:7px;cursor:pointer;transition:all .15s;}
.admin-shell .ak-seg-btn:hover{color:var(--ak-ink);}
.admin-shell .ak-seg-btn.is-active{background:var(--ak-panel);color:var(--ak-ink);box-shadow:0 1px 2px rgba(15,23,42,.08);}
.admin-shell .ak-btn{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:560;padding:8px 13px;border-radius:9px;cursor:pointer;transition:all .15s;border:1px solid transparent;}
.admin-shell .ak-btn:focus-visible{outline:2px solid var(--ak-accent);outline-offset:2px;}
.admin-shell .ak-btn:disabled{opacity:.5;cursor:not-allowed;}
.admin-shell .ak-btn-ghost{background:var(--ak-panel);border-color:var(--ak-line2);color:var(--ak-ink2);}
.admin-shell .ak-btn-ghost:hover:not(:disabled){color:var(--ak-ink);border-color:var(--ak-ink3);}
.admin-shell .ak-btn-primary{background:var(--ak-ink);color:#fff;}
.admin-shell .ak-btn-primary:hover:not(:disabled){background:#1B2433;}

/* card */
.admin-shell .ak-card{background:var(--ak-panel);border:1px solid var(--ak-line);border-radius:var(--ak-radius);box-shadow:var(--ak-shadow);padding:18px;}
.admin-shell .ak-card-flush{padding:0;}
.admin-shell .ak-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
.admin-shell .ak-card-flush .ak-card-head{padding:18px 18px 0;margin-bottom:12px;}
.admin-shell .ak-card-title{font-size:14px;font-weight:640;margin:0;letter-spacing:-0.01em;color:var(--ak-ink);}
.admin-shell .ak-card-desc{font-size:12px;color:var(--ak-ink3);margin:3px 0 0;}
.admin-shell .ak-card-actions{display:flex;align-items:center;gap:8px;}

/* grids — uniform card heights per row via stretch */
.admin-shell .ak-grid{display:grid;gap:14px;align-items:stretch;}
.admin-shell .ak-grid-2{grid-template-columns:repeat(2,1fr);}
.admin-shell .ak-grid-3{grid-template-columns:repeat(3,1fr);}
.admin-shell .ak-grid-4{grid-template-columns:repeat(4,1fr);}
.admin-shell .ak-grid-5{grid-template-columns:repeat(5,1fr);}

/* stat */
.admin-shell .ak-stat{display:flex;flex-direction:column;gap:10px;transition:border-color .15s,box-shadow .15s;}
.admin-shell .ak-stat:hover{border-color:var(--ak-line2);box-shadow:0 1px 2px rgba(15,23,42,.05),0 16px 30px -22px rgba(15,23,42,.3);}
.admin-shell .ak-stat-top{display:flex;justify-content:space-between;align-items:center;}
.admin-shell .ak-stat-label{font-size:12px;font-weight:560;color:var(--ak-ink2);}
.admin-shell .ak-stat-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--ak-panel2);color:var(--ak-ink2);}
.admin-shell .ak-stat-value{font-size:26px;font-weight:680;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;color:var(--ak-ink);}
.admin-shell .ak-tone-success .ak-stat-value{color:var(--ak-success);}
.admin-shell .ak-tone-warning .ak-stat-value{color:var(--ak-warning);}
.admin-shell .ak-tone-critical .ak-stat-value{color:var(--ak-critical);}
.admin-shell .ak-tone-success .ak-stat-icon{background:rgba(15,122,79,.1);color:var(--ak-success);}
.admin-shell .ak-tone-warning .ak-stat-icon{background:rgba(184,105,12,.12);color:var(--ak-warning);}
.admin-shell .ak-tone-critical .ak-stat-icon{background:rgba(197,57,43,.1);color:var(--ak-critical);}
.admin-shell .ak-stat-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.admin-shell .ak-stat-sub{font-size:11.5px;color:var(--ak-ink3);}
.admin-shell .ak-delta{display:inline-flex;align-items:center;gap:2px;font-size:11.5px;font-weight:620;padding:2px 6px;border-radius:6px;}
.admin-shell .ak-delta.is-good{color:var(--ak-success);background:rgba(15,122,79,.1);}
.admin-shell .ak-delta.is-bad{color:var(--ak-critical);background:rgba(197,57,43,.1);}
.admin-shell .ak-stat-bar{height:4px;border-radius:99px;background:var(--ak-line);overflow:hidden;}
.admin-shell .ak-stat-bar>div{height:100%;background:var(--ak-accent);border-radius:99px;transition:width .6s cubic-bezier(.22,1,.36,1);}

/* signal — hero KPI with trend */
.admin-shell .ak-signal{position:relative;display:flex;flex-direction:column;gap:9px;padding:18px 18px 0;overflow:hidden;min-height:150px;transition:border-color .15s,box-shadow .15s,transform .15s;}
.admin-shell .ak-signal:hover{border-color:var(--ak-line2);box-shadow:0 1px 2px rgba(15,23,42,.05),0 18px 34px -22px rgba(15,23,42,.34);transform:translateY(-1px);}
.admin-shell .ak-signal-rail{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:3px 0 0 3px;opacity:.9;}
.admin-shell .ak-signal-head{display:flex;justify-content:space-between;align-items:center;}
.admin-shell .ak-signal-label{font-size:12px;font-weight:600;color:var(--ak-ink2);text-transform:uppercase;letter-spacing:.045em;}
.admin-shell .ak-signal-value{font-size:34px;font-weight:700;letter-spacing:-0.035em;line-height:1;font-variant-numeric:tabular-nums;color:var(--ak-ink);}
.admin-shell .ak-tone-success .ak-signal-value{color:var(--ak-success);}
.admin-shell .ak-tone-warning .ak-signal-value{color:var(--ak-warning);}
.admin-shell .ak-tone-critical .ak-signal-value{color:var(--ak-critical);}
.admin-shell .ak-signal-foot{font-size:11px;color:var(--ak-ink3);font-weight:500;margin-top:2px;}
.admin-shell .ak-signal-spark{width:calc(100% + 36px);margin:6px -18px 0;height:48px;display:block;}

/* gauge */
.admin-shell .ak-gauge{position:relative;display:grid;place-items:center;}
.admin-shell .ak-gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.admin-shell .ak-gauge-score{font-size:36px;font-weight:700;letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;}
.admin-shell .ak-gauge-unit{font-size:12px;color:var(--ak-ink3);margin-top:2px;}
.admin-shell .ak-gauge-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ak-ink3);margin-top:6px;font-weight:600;}

/* sparkline */
.admin-shell .ak-spark{display:block;}

/* bullet */
.admin-shell .ak-bullet-head{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;}
.admin-shell .ak-bullet-name{font-weight:560;color:var(--ak-ink);}
.admin-shell .ak-bullet-sub{color:var(--ak-ink3);font-variant-numeric:tabular-nums;}
.admin-shell .ak-bullet+.ak-bullet{margin-top:14px;}
.admin-shell .ak-bullet-track{position:relative;height:7px;border-radius:99px;background:var(--ak-line);}
.admin-shell .ak-bullet-fill{height:100%;border-radius:99px;transition:width .5s;}
.admin-shell .ak-bullet-target{position:absolute;top:-3px;width:2px;height:13px;background:var(--ak-ink3);opacity:.5;transform:translateX(-1px);}

/* ranked bar list */
.admin-shell .ak-barlist{display:flex;flex-direction:column;gap:10px;}
.admin-shell .ak-barlist-row{display:grid;grid-template-columns:104px 1fr 44px;align-items:center;gap:10px;}
.admin-shell .ak-barlist-label{font-size:12.5px;color:var(--ak-ink2);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.admin-shell .ak-barlist-track{height:8px;border-radius:99px;background:var(--ak-panel2);overflow:hidden;}
.admin-shell .ak-barlist-fill{height:100%;border-radius:99px;transition:width .5s cubic-bezier(.22,1,.36,1);}
.admin-shell .ak-barlist-val{font-size:12.5px;font-weight:640;color:var(--ak-ink);text-align:right;}

/* buckets */
.admin-shell .ak-buckets-bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--ak-line);gap:2px;}
.admin-shell .ak-bucket-seg{height:100%;}
.admin-shell .ak-bucket-seg.is-idle{background:var(--ak-ink3);}
.admin-shell .ak-bucket-seg.is-healthy{background:var(--ak-success);}
.admin-shell .ak-bucket-seg.is-busy{background:var(--ak-warning);}
.admin-shell .ak-bucket-seg.is-over{background:var(--ak-critical);}
.admin-shell .ak-buckets-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;}
.admin-shell .ak-bucket-li{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ak-ink2);}
.admin-shell .ak-bucket-li i{width:9px;height:9px;border-radius:3px;}
.admin-shell .ak-bucket-li i.is-idle{background:var(--ak-ink3);}
.admin-shell .ak-bucket-li i.is-healthy{background:var(--ak-success);}
.admin-shell .ak-bucket-li i.is-busy{background:var(--ak-warning);}
.admin-shell .ak-bucket-li i.is-over{background:var(--ak-critical);}
.admin-shell .ak-bucket-li b{color:var(--ak-ink);font-variant-numeric:tabular-nums;}

/* pills */
.admin-shell .ak-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:560;padding:3px 9px;border-radius:99px;white-space:nowrap;}
.admin-shell .ak-pill.is-ok{background:rgba(15,122,79,.1);color:var(--ak-success);}
.admin-shell .ak-pill.is-ok circle{fill:var(--ak-success);}
.admin-shell .ak-pill.is-warn{background:rgba(184,105,12,.12);color:var(--ak-warning);}
.admin-shell .ak-pill.is-warn circle{fill:var(--ak-warning);}
.admin-shell .ak-pill.is-crit{background:rgba(197,57,43,.1);color:var(--ak-critical);}
.admin-shell .ak-pill.is-crit circle{fill:var(--ak-critical);}
.admin-shell .ak-pill.is-info{background:rgba(14,99,201,.1);color:var(--ak-accent);}
.admin-shell .ak-pill.is-info circle{fill:var(--ak-accent);}
.admin-shell .ak-pill.is-muted{background:var(--ak-panel2);color:var(--ak-ink2);}
.admin-shell .ak-pill.is-muted circle{fill:var(--ak-ink3);}
.admin-shell .ak-sev{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;}

/* empty */
.admin-shell .ak-empty{display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;padding:26px 14px;gap:6px;min-height:180px;}
.admin-shell .ak-empty-sm{min-height:110px;padding:18px;}
.admin-shell .ak-empty-badge{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(15,122,79,.1);color:var(--ak-success);margin-bottom:4px;}
.admin-shell .ak-empty-title{font-size:13.5px;font-weight:620;margin:0;color:var(--ak-ink);}
.admin-shell .ak-empty-sub{font-size:12px;color:var(--ak-ink3);margin:0;max-width:260px;line-height:1.5;}

/* table */
.admin-shell .ak-table-wrap{overflow-x:auto;}
.admin-shell .ak-table{width:100%;border-collapse:collapse;font-size:13px;}
.admin-shell .ak-th{text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ak-ink3);padding:9px 14px;border-bottom:1px solid var(--ak-line);white-space:nowrap;background:var(--ak-panel);}
.admin-shell .ak-th.is-right{text-align:right;} .admin-shell .ak-th.is-center{text-align:center;}
.admin-shell .ak-table td.ak-num{text-align:right;font-variant-numeric:tabular-nums;} .admin-shell .ak-table td.ak-center{text-align:center;}
.admin-shell .ak-th-sort{cursor:pointer;user-select:none;}
.admin-shell .ak-th-sort>span{display:inline-flex;align-items:center;gap:3px;}
.admin-shell .ak-th.is-right>span{flex-direction:row-reverse;}
.admin-shell .ak-th-caret{opacity:.35;transition:opacity .15s;}
.admin-shell .ak-th-sort:hover .ak-th-caret{opacity:.7;}
.admin-shell .ak-th-sort.is-active{color:var(--ak-ink);} .admin-shell .ak-th-sort.is-active .ak-th-caret{opacity:1;color:var(--ak-accent);}
.admin-shell .ak-table td{padding:11px 14px;border-bottom:1px solid var(--ak-line);vertical-align:middle;color:var(--ak-ink);}
.admin-shell .ak-table tbody tr{transition:background .12s;}
.admin-shell .ak-table tbody tr:hover{background:var(--ak-panel2);}
.admin-shell .ak-table tbody tr:last-child td{border-bottom:0;}
.admin-shell .ak-pager{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-top:1px solid var(--ak-line);}
.admin-shell .ak-pager-info{font-size:12px;color:var(--ak-ink3);font-variant-numeric:tabular-nums;}
.admin-shell .ak-pager-btns{display:flex;gap:6px;}
.admin-shell .ak-pager-btn{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;border:1px solid var(--ak-line2);background:var(--ak-panel);color:var(--ak-ink2);cursor:pointer;transition:all .15s;}
.admin-shell .ak-pager-btn:hover:not(:disabled){color:var(--ak-ink);border-color:var(--ak-ink3);}
.admin-shell .ak-pager-btn:disabled{opacity:.4;cursor:not-allowed;}

/* Refine the shared typography scale on every admin screen (scoped) so bespoke
   headers (type-title / type-widget / type-section) match the redesigned pages. */
.admin-shell .type-title{ font-size:1.375rem; line-height:1.15; font-weight:680; letter-spacing:-0.025em; }
.admin-shell .type-section{ font-weight:660; letter-spacing:-0.015em; }
.admin-shell .type-widget{ letter-spacing:-0.01em; }

/* Unify the shared <Card> look across ALL admin screens (scoped): the base Card ships
   hardcoded border-zinc-200 + shadow-sm + rounded-lg (not themed) — align them to the kit
   shadow / 14px radius / navy hairline so every admin card matches the dashboard. */
.admin-shell .shadow-card,.admin-shell .shadow-sm{ box-shadow:var(--ak-shadow); }
.admin-shell .shadow-card{ border-radius:14px; }
.admin-shell .border-zinc-200{ border-color:var(--ak-line); }

/* Structural refinement of the shared <Table> across ALL admin screens (scoped).
   .admin-shell table… outranks the utility classes, so every admin data table gets the
   premium kit look (uppercase muted headers, row hover, consistent density) with no
   per-screen edits. Recharts uses SVG, so charts are unaffected. */
.admin-shell table thead th{
  text-transform:uppercase; font-size:11px; letter-spacing:.05em; font-weight:600;
  color:var(--ak-ink3); background:var(--ak-panel); border-bottom:1px solid var(--ak-line);
  padding:10px 14px; white-space:nowrap;
}
.admin-shell table tbody td{ padding:11px 14px; border-bottom:1px solid var(--ak-line); color:var(--ak-ink); }
.admin-shell table tbody tr{ transition:background .12s; }
.admin-shell table tbody tr:hover{ background:var(--ak-panel2); }
.admin-shell table tbody tr:last-child td{ border-bottom:0; }

/* tab bar (works with shadcn Tabs via data-state) */
.admin-shell .ak-tabs{display:flex;flex-wrap:wrap;gap:2px;background:var(--ak-panel2);border:1px solid var(--ak-line2);border-radius:11px;padding:3px;height:auto;}
.admin-shell .ak-tab{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:560;color:var(--ak-ink2);border:0;background:transparent;cursor:pointer;transition:all .15s;}
.admin-shell .ak-tab:hover{color:var(--ak-ink);}
.admin-shell .ak-tab[data-state="active"]{background:var(--ak-panel);color:var(--ak-ink);box-shadow:0 1px 2px rgba(15,23,42,.1);}
.admin-shell .ak-tab-badge{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 5px;border-radius:99px;font-size:10.5px;font-weight:700;background:var(--ak-ink);color:#fff;}
.admin-shell .ak-tab-badge.is-crit{background:var(--ak-critical);}

/* banner (critical alert) */
.admin-shell .ak-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid var(--ak-critical);background:rgba(197,57,43,.06);border-radius:var(--ak-radius);padding:14px 16px;}
.admin-shell .ak-banner-icon{position:relative;display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:rgba(197,57,43,.12);color:var(--ak-critical);flex:none;}
.admin-shell .ak-banner-title{font-size:13px;font-weight:640;color:var(--ak-critical);}
.admin-shell .ak-banner-sub{font-size:12px;color:var(--ak-ink2);margin-top:2px;}

/* alert row (quick actions) */
.admin-shell .ak-alert{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--ak-panel2);border:1px solid var(--ak-line);border-radius:10px;padding:11px 12px;}
.admin-shell .ak-alert-title{font-size:12.5px;font-weight:580;color:var(--ak-ink);display:block;}
.admin-shell .ak-alert-sub{font-size:11.5px;color:var(--ak-ink3);margin-top:2px;display:block;}

/* filter controls */
.admin-shell .ak-filter-bar{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;}
.admin-shell .ak-field{display:flex;flex-direction:column;gap:5px;}
.admin-shell .ak-field-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ak-ink3);}
.admin-shell .ak-select,.admin-shell .ak-date{height:34px;padding:0 10px;border:1px solid var(--ak-line2);border-radius:9px;background:var(--ak-panel);color:var(--ak-ink2);font-size:12px;font-weight:500;min-width:130px;transition:border-color .15s;cursor:pointer;}
.admin-shell .ak-select:hover,.admin-shell .ak-date:hover{border-color:var(--ak-ink3);}
.admin-shell .ak-select:focus,.admin-shell .ak-date:focus{outline:none;border-color:var(--ak-accent);box-shadow:0 0 0 3px rgba(14,99,201,.12);}
.admin-shell .ak-toggle{height:28px;padding:0 11px;border-radius:99px;font-size:11px;font-weight:560;border:1px solid var(--ak-line2);background:var(--ak-panel);color:var(--ak-ink2);cursor:pointer;transition:all .15s;}
.admin-shell .ak-toggle:hover{color:var(--ak-ink);border-color:var(--ak-ink3);}
.admin-shell .ak-toggle.is-on{background:var(--ak-ink);border-color:var(--ak-ink);color:#fff;}

/* chart helpers */
.admin-shell .ak-chartgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;align-items:stretch;}
.admin-shell .ak-col-full{grid-column:1 / -1;}
.admin-shell .ak-chartbox{position:relative;width:100%;}
.admin-shell .ak-chart{height:240px;margin:0 -4px;}
.admin-shell .ak-chart-sm{height:200px;}
.admin-shell .ak-legend{display:flex;gap:14px;font-size:11.5px;color:var(--ak-ink2);flex-wrap:wrap;}
.admin-shell .ak-legend span{display:inline-flex;align-items:center;gap:6px;}
.admin-shell .ak-legend i{width:9px;height:9px;border-radius:3px;display:inline-block;}

/* table cell helpers reused by screens */
.admin-shell .ak-person{display:flex;align-items:center;gap:10px;}
.admin-shell .ak-avatar{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:640;background:var(--ak-panel2);color:var(--ak-ink2);border:1px solid var(--ak-line2);flex:none;}
.admin-shell .ak-person-name{font-weight:580;font-size:13px;color:var(--ak-ink);}
.admin-shell .ak-person-meta{font-size:11px;color:var(--ak-ink3);}
.admin-shell .ak-chip{display:inline-block;font-size:11px;font-weight:560;padding:2px 8px;border-radius:6px;background:var(--ak-panel2);border:1px solid var(--ak-line2);color:var(--ak-ink2);}
.admin-shell .ak-util{display:flex;align-items:center;gap:9px;min-width:120px;}
.admin-shell .ak-util-track{flex:1;height:6px;border-radius:99px;background:var(--ak-line);overflow:hidden;}
.admin-shell .ak-util-track>div{height:100%;border-radius:99px;transition:width .5s;}

/* skeleton */
.admin-shell .ak-skel{position:relative;overflow:hidden;background:var(--ak-line);border-radius:8px;}
.admin-shell .ak-skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:ak-shimmer 1.3s infinite;}
.admin-shell .ak-skel-val{height:26px;width:70%;}
.admin-shell .ak-skel-row{height:34px;width:100%;margin:4px 0;}
@keyframes ak-shimmer{100%{transform:translateX(100%);}}

@media (prefers-reduced-motion: reduce){
  .admin-shell *{transition:none!important;animation:none!important;}
}

/* responsive */
@media (max-width:1180px){
  .admin-shell .ak-grid-5{grid-template-columns:repeat(3,1fr);}
  .admin-shell .ak-grid-4{grid-template-columns:repeat(2,1fr);}
  .admin-shell .ak-grid-3,.admin-shell .ak-grid-2{grid-template-columns:1fr;}
}
@media (max-width:1024px){
  .admin-shell .ak-chartgrid{grid-template-columns:1fr;}
}
@media (max-width:640px){
  .admin-shell .ak-grid-5,.admin-shell .ak-grid-4{grid-template-columns:repeat(2,1fr);}
}
`;
