'use client';

import React from 'react';
import { Clock, Info } from 'lucide-react';
import { getTargetHours, DEFAULT_SLA_TARGETS, type ClientSlaTargets } from '../../lib/sla/slaEngine';

/**
 * Create-ticket SLA panel — the ONLY thing the create form may show for SLA.
 * Sourced entirely from the engine: SLA applies only to Incident, and the target
 * hours come from the selected client's client_sla_targets by priority via
 * getTargetHours (defaults 8/16/32/64 when the client has no configured targets,
 * labelled "default"). No hardcoded SLA hours.
 */

const PRIORITY_ROWS: Array<{ key: keyof ClientSlaTargets; label: string }> = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export function CreateTicketSlaPanel({
  ticketType,
  priority,
  targets,
}: {
  ticketType: string;
  priority: string;
  /** The client's configured targets, or null when none are set (→ defaults). */
  targets: ClientSlaTargets | null;
}) {
  // SLA applies ONLY to Incident tickets.
  if (ticketType !== 'Incident') {
    return (
      <div className="bg-surface-muted border border-line rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-ink-secondary font-sans">
        <Info className="text-ink-muted shrink-0 mt-0.5" size={14} />
        <span>
          SLA not applicable for this ticket type{ticketType ? ` (${ticketType})` : ''}. Time-bound SLA targets apply to <span className="font-bold text-ink">Incident</span> tickets only.
        </span>
      </div>
    );
  }

  const isDefault = !targets;
  const resolved = targets ?? DEFAULT_SLA_TARGETS;
  const selectedHours = getTargetHours(priority, resolved);

  return (
    <div className="bg-surface-muted border border-line/80 rounded-lg p-3 space-y-2 text-[11px] text-ink-secondary font-sans">
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink uppercase block text-[11px] flex items-center gap-1.5">
          <Clock className="text-ink-secondary" size={14} /> SLA Response Target
        </span>
        <span className="font-bold text-ink">
          {selectedHours}h <span className="text-ink-muted font-normal">for {priority}</span>
          {isDefault && <span className="ml-1 text-ink-muted font-normal">(default)</span>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {PRIORITY_ROWS.map(({ key, label }) => (
          <div
            key={key}
            className={`rounded border px-1.5 py-1 text-center ${
              label === priority ? 'border-brand-border bg-brand-soft text-brand-strong font-bold' : 'border-line bg-surface text-ink-secondary'
            }`}
          >
            <span className="block text-[10px] uppercase tracking-wide">{label}</span>
            <span className="block font-bold text-ink">{resolved[key]}h</span>
          </div>
        ))}
      </div>

      <span className="block text-ink-muted">
        IST business hours 10:30–19:30, Sun–Thu; clock starts on lead-consultant assignment; Fri/Sat &amp; out-of-window time paused.
      </span>
    </div>
  );
}
