// Restrained Enterprise Chart Palette
// Contains unified colors used across all recharts visualizations in the dashboard.
export const chartColors = {
  // 6-color categorical sequence (muted blues, slates, teals, ambers - no neon/purple)
  categorical: [
    '#2563eb', // Blue 600 (Primary/Corporate)
    '#0d9488', // Teal 600
    '#475569', // Slate 600
    '#d97706', // Amber 600
    '#0284c7', // Sky 600
    '#64748b', // Slate 500
  ],
  // State-based semantic color mapping
  semantic: {
    success: '#10b981', // Emerald 500 (On Track / Active / Resolved)
    warning: '#f59e0b', // Amber 500 (At Risk / Pending)
    danger: '#ef4444',  // Red 500 (Breached / Critical)
    info: '#3b82f6',    // Blue 500 (Neutral / Info / Muted)
    neutral: '#94a3b8', // Slate 400
  }
};

export const COLORS = {
  blue: chartColors.semantic.info,
  green: chartColors.semantic.success,
  amber: chartColors.semantic.warning,
  red: chartColors.semantic.danger,
  gray: chartColors.semantic.neutral,
};

export const priorityColors = {
  Critical: chartColors.semantic.danger,
  High: '#f97316', // Orange
  Medium: chartColors.semantic.warning,
  Low: chartColors.semantic.neutral,
};

/**
 * THE single categorical palette every Recharts series imports. Do NOT hardcode
 * hex anywhere in chart components — pull a color by index from CHART_COLORS, or
 * a state color from SEMANTIC / PRIORITY_COLOR / STATUS_COLOR below.
 */
export const CHART_COLORS = chartColors.categorical;

export const SEMANTIC = chartColors.semantic;

// Priority → fixed severity color, so a "priority" series reads identically everywhere.
export const PRIORITY_COLOR: Record<string, string> = {
  Critical: chartColors.semantic.danger,
  High: '#f97316',
  Medium: chartColors.semantic.warning,
  Low: chartColors.semantic.neutral,
};

// Coarse lifecycle bucket → color for status donuts / stacked flows.
export const STATUS_COLOR: Record<string, string> = {
  New: chartColors.categorical[0],
  Assigned: chartColors.categorical[4],
  'In Progress': chartColors.semantic.info,
  'Pending Closure': chartColors.semantic.warning,
  Closed: chartColors.semantic.success,
  Escalated: chartColors.semantic.danger,
  Reopened: '#f97316',
};
