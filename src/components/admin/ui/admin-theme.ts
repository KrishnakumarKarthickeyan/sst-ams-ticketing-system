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
  ink: '#0F172A',        // primary / foreground (navy)
  ink2: '#475569',       // secondary text
  ink3: '#8A93A3',       // muted text / axis
  line: '#E7EAF0',       // hairline border
  line2: '#DCE0E8',      // stronger border
  panel: '#FFFFFF',
  panel2: '#F6F8FB',     // subtle fill / track
  bg: '#F7F9FC',
  accent: '#0E63C9',     // blue CTA (skill #0369A1 deepened for 4.5:1 on white)
  accentInk: '#0B4DA0',
  amber: '#C2730C',      // skill highlight #D97706 (AA tuned)
  success: '#0F7A4F',
  warning: '#B8690C',
  critical: '#C5392B',
} as const;

/** Severity ramp Critical→High→Medium→Low (accessible, no color-only reliance — always paired with text). */
export const SEVERITY: Record<'Critical' | 'High' | 'Medium' | 'Low', string> = {
  Critical: '#C5392B', // red
  High: '#C2730C',     // amber
  Medium: '#0E63C9',   // blue
  Low: '#64748B',      // slate
};

/** Harmonious categorical sequence for charts (blue/cyan/teal/slate/amber — no purple/neon). */
export const ADMIN_CATEGORICAL = [
  '#0E63C9', // blue 700
  '#0E7490', // cyan 700
  '#0F766E', // teal 700
  '#475569', // slate 600
  '#C2730C', // amber 700
  '#1E40AF', // blue 800
  '#0891B2', // cyan 600
  '#64748B', // slate 500
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
