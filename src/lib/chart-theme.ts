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
