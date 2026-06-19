'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { ClientSlaTargets } from '../../lib/sla/slaEngine';

interface Props {
  organizationId?: string | null;
  /** Manager + SuperAdmin may edit; everyone else sees read-only. */
  canEdit?: boolean;
}

const PRIORITIES: { key: keyof ClientSlaTargets; label: string }[] = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

/**
 * Per-client SLA targets (business hours per priority). Editable by manager/admin,
 * read-only for everyone else. Prefilled from client_sla_targets (defaults
 * 8/16/32/64). Save upserts via the shared context mutation.
 */
export function ClientSlaTargetsCard({ organizationId, canEdit = false }: Props) {
  const { getClientTargets, upsertClientSlaTargets } = useTickets();
  const current = getClientTargets(organizationId);
  const [draft, setDraft] = useState<ClientSlaTargets>(current);
  const [saving, setSaving] = useState(false);

  // Re-sync when the resolved targets change (e.g. after a load).
  useEffect(() => {
    setDraft(getClientTargets(organizationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, current.critical, current.high, current.medium, current.low]);

  const setField = (k: keyof ClientSlaTargets, v: string) =>
    setDraft(d => ({ ...d, [k]: v === '' ? 0 : Number(v) }));

  const dirty = PRIORITIES.some(p => draft[p.key] !== current[p.key]);

  const save = async () => {
    if (!organizationId) { toast.error('No organization for this client.'); return; }
    setSaving(true);
    const res = await upsertClientSlaTargets(organizationId, draft);
    setSaving(false);
    if (res.success) toast.success('SLA targets updated.');
    else toast.error(res.error || 'Failed to save SLA targets.');
  };

  return (
    <div className="space-y-3 rounded-md border border-line p-4 bg-surface">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-600" />
        <h4 className="text-sm font-semibold text-ink">SLA Targets</h4>
        <span className="ml-auto text-[11px] text-ink-muted">Business hours · 10:30–19:30 IST · Sun–Thu</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {PRIORITIES.map(p => (
          <div key={p.key} className="space-y-1">
            <Label className="text-xs">{p.label} (h)</Label>
            {canEdit ? (
              <Input
                type="number"
                min="0"
                step="0.5"
                value={String(draft[p.key])}
                onChange={e => setField(p.key, e.target.value)}
              />
            ) : (
              <div className="rounded border border-line bg-surface-muted px-2 py-1.5 text-sm font-bold tabular-nums text-ink">
                {current[p.key]}h
              </div>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="mr-2 h-3.5 w-3.5" /> Save SLA Targets</>}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ClientSlaTargetsCard;
