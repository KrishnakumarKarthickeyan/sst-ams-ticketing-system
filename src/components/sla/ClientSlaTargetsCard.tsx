'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { slaTargetsSchema, type SlaTargetsForm } from '../../lib/schemas/client';

interface Props {
  organizationId?: string | null;
  /** Manager + SuperAdmin may edit; everyone else sees read-only. */
  canEdit?: boolean;
}

const PRIORITIES: { key: keyof SlaTargetsForm; label: string }[] = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

/**
 * Per-client SLA targets (business hours per priority). Editable by manager/admin,
 * read-only for everyone else. Validated by `slaTargetsSchema` via react-hook-form
 * (zodResolver). Save upserts through the shared context mutation.
 */
export function ClientSlaTargetsCard({ organizationId, canEdit = false }: Props) {
  const { getClientTargets, upsertClientSlaTargets } = useTickets();
  const current = getClientTargets(organizationId);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SlaTargetsForm>({
    resolver: zodResolver(slaTargetsSchema),
    defaultValues: current,
  });

  // Re-sync the form when the resolved targets change (e.g. after a load).
  useEffect(() => {
    reset(getClientTargets(organizationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, current.critical, current.high, current.medium, current.low]);

  const onSubmit = async (values: SlaTargetsForm) => {
    if (!organizationId) { toast.error('No organization for this client.'); return; }
    const res = await upsertClientSlaTargets(organizationId, values);
    if (res.success) { toast.success('SLA targets updated.'); reset(values); }
    else toast.error(res.error || 'Failed to save SLA targets.');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border border-line p-4 bg-surface">
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
              <>
                <Input type="number" min="0" step="0.5" {...register(p.key, { valueAsNumber: true })} />
                {errors[p.key] && <p className="text-[11px] text-red-600">{errors[p.key]?.message as string}</p>}
              </>
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
          <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="mr-2 h-3.5 w-3.5" /> Save SLA Targets</>}
          </Button>
        </div>
      )}
    </form>
  );
}

export default ClientSlaTargetsCard;
