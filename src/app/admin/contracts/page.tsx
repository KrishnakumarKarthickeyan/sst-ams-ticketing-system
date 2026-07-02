'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { FileText, Layers, Timer, Gauge, ShieldCheck } from 'lucide-react';
import {
  AdminPageHeader, AdminCommandRibbon, AdminGrid, AdminStat, AdminCard, AdminBullet, AdminEmpty,
} from '../../../components/admin/ui/admin-kit';

export default function AdminContractsPage() {
  const { contracts } = useTickets();

  const kpis = React.useMemo(() => {
    const allocated = contracts.reduce((s, c) => s + (c.totalHours || 0), 0);
    const burned = contracts.reduce((s, c) => s + (c.usedHours || 0), 0);
    return {
      count: contracts.length,
      allocated,
      burned,
      util: allocated > 0 ? Math.round((burned / allocated) * 100) : 0,
    };
  }, [contracts]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={<><ShieldCheck size={13} strokeWidth={2} /> AMS agreements</>}
        title="AMS Support Agreements"
        subtitle="Customer allocation pools, monthly burn, and agreement compliance across all clients."
      />

      <AdminCommandRibbon
        status={kpis.util > 90 ? 'crit' : kpis.util >= 75 ? 'warn' : 'ok'}
        verdict={kpis.util > 90 ? 'Pools Near Exhaustion' : kpis.util >= 75 ? 'Watch Burn Rate' : 'Healthy Burn Rate'}
        items={[
          { label: 'Agreements', value: kpis.count },
          { label: 'Allocated', value: `${kpis.allocated.toLocaleString()}h` },
          { label: 'Burned', value: `${kpis.burned.toLocaleString()}h` },
          { label: 'Remaining', value: `${Math.max(0, kpis.allocated - kpis.burned).toLocaleString()}h`, tone: 'success' },
          { label: 'Avg Utilization', value: `${kpis.util}%`, tone: kpis.util > 90 ? 'critical' : kpis.util >= 75 ? 'warning' : 'success' },
        ]}
      />

      <AdminGrid cols={4}>
        <AdminStat label="Active Agreements" value={kpis.count} icon={<FileText size={15} strokeWidth={2} />} sub="support contracts" />
        <AdminStat label="Allocated Hours" value={`${kpis.allocated.toLocaleString()}h`} icon={<Layers size={15} strokeWidth={2} />} sub="total pool" />
        <AdminStat label="Burned Hours" value={`${kpis.burned.toLocaleString()}h`} icon={<Timer size={15} strokeWidth={2} />} sub="consumed to date" />
        <AdminStat label="Avg Utilization" value={`${kpis.util}%`} tone={kpis.util > 90 ? 'critical' : kpis.util >= 75 ? 'warning' : 'neutral'} icon={<Gauge size={15} strokeWidth={2} />} sub="pool consumed" progress={kpis.util} />
      </AdminGrid>

      {contracts.length === 0 ? (
        <AdminCard title="Agreements">
          <AdminEmpty icon={<FileText size={18} />} title="No agreements yet" sub="Client support contracts will appear here once created." />
        </AdminCard>
      ) : (
        <AdminGrid cols={3}>
          {contracts.map((c) => {
            const util = c.totalHours > 0 ? Math.round((c.usedHours / c.totalHours) * 100) : 0;
            return (
              <AdminCard key={c.id}>
                <div className="flex items-start justify-between">
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ak-ink3)' }}>{c.contractType}</span>
                  <span className="ak-pill is-ok"><svg width="7" height="7"><circle cx="3.5" cy="3.5" r="3.5" /></svg>Active</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 660, color: 'var(--ak-ink)', margin: '8px 0 2px', letterSpacing: '-0.01em' }}>{c.organizationName}</h3>
                <p style={{ fontSize: 11.5, color: 'var(--ak-ink3)', marginBottom: 14 }}>Valid {c.startDate} → {c.endDate}</p>
                <AdminBullet label={`${util}% burned`} value={c.usedHours} max={c.totalHours || 1} valueText={`${c.usedHours} / ${c.totalHours}h`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--ak-line)', fontSize: 11, color: 'var(--ak-ink3)', fontWeight: 560 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={12} /> Compliance active</span>
                  <span className="ak-num">Budget/mo {c.monthlyBudgetHours}h</span>
                </div>
              </AdminCard>
            );
          })}
        </AdminGrid>
      )}
    </div>
  );
}
