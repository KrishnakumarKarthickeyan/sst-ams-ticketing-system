// Canonical ticket status / priority badge styling.
// Single source of truth — this map was previously copy-pasted into three list
// pages and had drifted (different status sets and shades per page).

export interface StatusBadgeConfig {
  label: string;
  color: string;
}

export interface PriorityBadgeConfig {
  label: string;
  color: string;
  dot: string;
}

export const statusConfig: Record<string, StatusBadgeConfig> = {
  'New':                       { label: 'New',            color: 'text-zinc-700 bg-zinc-100 border-zinc-200 font-bold' },
  'Assigned':                  { label: 'Assigned',       color: 'text-brand-strong bg-brand-soft border-brand-border' },
  'Requirement Gathering':     { label: 'Req. Gathering', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  'Waiting for Hours Approval':{ label: 'Hrs Approval',   color: 'text-warning-strong bg-warning-soft border-warning-border' },
  'In Progress - Technical':   { label: 'IP Technical',   color: 'text-brand-strong bg-brand-soft border-brand-border' },
  'In Progress - Functional':  { label: 'IP Functional',  color: 'text-info-strong bg-info-soft border-info-border' },
  'In Progress':               { label: 'In Progress',    color: 'text-brand-strong bg-brand-soft border-brand-border' },
  'Raised to SAP':             { label: 'Raised to SAP',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Customer Action':           { label: 'Cust. Action',   color: 'text-warning-strong bg-warning-soft border-warning-border' },
  'On Hold':                   { label: 'On Hold',        color: 'text-zinc-600 bg-zinc-100 border-zinc-200' },
  'Request for Closure':       { label: 'Req. Closure',   color: 'text-success-strong bg-success-soft border-success-border' },
  'Closed':                    { label: 'Closed',         color: 'text-zinc-600 bg-zinc-200 border-zinc-300' },
  'Reopened':                  { label: 'Reopened',       color: 'text-critical-strong bg-critical-soft border-critical-border' },
  'Awaiting Functional Submission': { label: 'Awaiting Func. Sub', color: 'text-info-strong bg-info-soft border-info-border' },
  'Awaiting Technical Submission':  { label: 'Awaiting Tech. Sub', color: 'text-brand-strong bg-brand-soft border-brand-border' },
  'Awaiting Manager Approval':      { label: 'Awaiting Mgr Appr', color: 'text-success-strong bg-success-soft border-success-border' },
};

export const fallbackStatus: StatusBadgeConfig = {
  label: '',
  color: 'text-slate-600 bg-slate-50 border-slate-200',
};

export const priorityConfig: Record<string, PriorityBadgeConfig> = {
  Critical: { label: 'Critical', color: 'text-critical-strong bg-critical-soft border-critical-border', dot: 'bg-red-500' },
  High:     { label: 'High',     color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
  Medium:   { label: 'Medium',   color: 'text-warning-strong bg-warning-soft border-warning-border', dot: 'bg-amber-400' },
  Low:      { label: 'Low',      color: 'text-zinc-600 bg-zinc-50 border-zinc-200', dot: 'bg-zinc-400' },
};
