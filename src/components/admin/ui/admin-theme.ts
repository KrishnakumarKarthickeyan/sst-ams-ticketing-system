/**
 * SuperAdmin scoped design tokens — derived from the ui-ux-pro-max skill.
 *
 * Source of guidance (skill output, applied verbatim where it fit):
 *  • Style: "Data-Dense Dashboard" (KPI cards + charts + tables, space-efficient grid).
 *  • Palette: B2B Service — navy ink #0F172A, muted-fg #64748B, border #E2E8F0,
 *    ground #F8FAFC, blue accent #0369A1, amber highlight #D97706 (skill design-system).
 *  • Charts: trend→line/area (fill ~20%), KPI vs target→bullet (values always visible),
 *    single KPI→gauge; categorical series harmonious + accessible (no color-only meaning).
 *
 * SCOPE: these constants are consumed ONLY by admin (SuperAdmin) screens/components.
 * The CSS variables they mirror live under `.admin-shell` (see admin-kit.tsx), so the
 * theme cannot bleed into Manager/Consultant/Customer surfaces.
 */
import type { CSSProperties } from 'react';

export const ADMIN = {
  ink: '#1A1D23',        // primary / foreground (near-black)
  ink2: '#5A6472',       // secondary text
  ink3: '#9098A4',       // muted text / axis
  line: '#ECEEF2',       // hairline border
  line2: '#E1E4EA',      // stronger border
  panel: '#FFFFFF',
  panel2: '#F7F8FA',     // subtle fill / track
  bg: '#F4F5F7',
  accent: '#6C5DD3',     // violet-indigo primary (light SaaS theme)
  accentInk: '#5A49C0',
  amber: '#C2730C',
  success: '#12A594',    // teal
  warning: '#B8690C',
  critical: '#E1483B',
} as const;

/** Severity ramp Critical→High→Medium→Low (accessible, no color-only reliance — always paired with text). */
export const SEVERITY: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: '#E1483B', // red
  High: '#C2730C',     // amber
  Medium: '#6C5DD3',   // violet
  Low: '#94A3B8',      // light slate
};

/** Harmonious categorical sequence for charts (violet/teal/blue/indigo/amber — colorful, no neon). */
export const ADMIN_CATEGORICAL = [
  '#6C5DD3', // violet (lead)
  '#12A594', // teal
  '#3B82F6', // blue
  '#8B7FE0', // light violet
  '#C2730C', // amber
  '#0E9384', // deep teal
  '#4F46E5', // indigo
  '#94A3B8', // slate
];

/** Semantic chart colors (status). */
export const ADMIN_SEMANTIC = {
  success: ADMIN.success,
  warning: ADMIN.warning,
  danger: ADMIN.critical,
  info: ADMIN.accent,
  neutral: ADMIN.ink3,
};

/** Shared Recharts tooltip style (skill: tooltips on interact, readable, near data). */
export const ADMIN_TOOLTIP: CSSProperties = {
  background: ADMIN.panel,
  border: `1px solid ${ADMIN.line2}`,
  borderRadius: 10,
  boxShadow: '0 10px 30px -14px rgba(15,23,42,.28)',
  fontSize: 12,
  color: ADMIN.ink,
  padding: '8px 11px',
};

/** Axis tick style (skill: subtle gridlines, readable axes). */
export const ADMIN_AXIS = { fill: ADMIN.ink3, fontSize: 11 };
export const ADMIN_GRID = ADMIN.line;
