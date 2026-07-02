'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { ShieldCheck, Activity, Users, FileClock, CalendarClock } from 'lucide-react';
import {
  AdminPageHeader, AdminCommandRibbon, AdminGrid, AdminStat, AdminCard, AdminDataTable, AdminEmpty, type AdminColumn,
} from '../../../components/admin/ui/admin-kit';

type LogRow = { id: string; timestamp: string; actor: string; action: string; target: string; details: string };

export default function AdminAuditLogsPage() {
  const { tickets, loading } = useTickets();

  // Immutable audit ledger built from ticket history (unchanged logic).
  const logs = React.useMemo<LogRow[]>(() => {
    return tickets
      .flatMap((ticket) =>
        (ticket.history || []).map((h) => ({
          id: h.id,
          timestamp: h.createdAt,
          actor: h.changedBy || 'System',
          action: `Update ${h.fieldChanged || 'Ticket'}`,
          target: ticket.title || `Ticket #${ticket.ticketNumber || ticket.id}`,
          details: h.fieldChanged
            ? `Changed ${h.fieldChanged} from "${h.oldValue}" to "${h.newValue}"`
            : `Ticket activity logged.`,
        })),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [tickets]);

  const kpis = React.useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const distinct = (arr: string[]) => new Set(arr).size;
    return {
      total: logs.length,
      today: logs.filter(l => new Date(l.timestamp).getTime() >= startOfToday.getTime()).length,
      actors: distinct(logs.map(l => l.actor)),
      entities: distinct(logs.map(l => l.target)),
    };
  }, [logs]);

  const columns: AdminColumn<LogRow>[] = [
    { key: 'ts', header: 'Timestamp', sortValue: r => new Date(r.timestamp).getTime(), width: '180px',
      render: r => <span className="ak-num" style={{ color: 'var(--ak-ink3)', whiteSpace: 'nowrap' }}>{new Date(r.timestamp).toLocaleString()}</span> },
    { key: 'actor', header: 'Actor', sortValue: r => r.actor, width: '160px',
      render: r => <span style={{ fontWeight: 580, color: 'var(--ak-ink)' }}>{r.actor}</span> },
    { key: 'action', header: 'Action', sortValue: r => r.action,
      render: r => <span className="ak-chip"><Activity size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} />{r.action}</span> },
    { key: 'target', header: 'Target Entity', sortValue: r => r.target,
      render: r => <span style={{ color: 'var(--ak-ink2)', display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.target}>{r.target}</span> },
    { key: 'details', header: 'Details', align: 'right', sortValue: r => r.details,
      render: r => <span style={{ color: 'var(--ak-ink3)', fontSize: 11.5 }}>{r.details}</span> },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={<><ShieldCheck size={13} strokeWidth={2} /> Security ledger</>}
        title="System Audit Logs"
        subtitle="Immutable ledger of platform administrative adjustments, routing transitions, and database mutations."
      />

      <AdminCommandRibbon
        status="ok"
        verdict={kpis.today > 0 ? `${kpis.today} Events Today` : 'Quiet Today'}
        items={[
          { label: 'Total Events', value: kpis.total },
          { label: 'Today', value: kpis.today, tone: kpis.today > 0 ? 'success' : 'neutral' },
          { label: 'Distinct Actors', value: kpis.actors },
          { label: 'Entities Touched', value: kpis.entities },
        ]}
      />

      <AdminGrid cols={4}>
        <AdminStat label="Total Events" value={kpis.total} icon={<FileClock size={15} strokeWidth={2} />} sub="in the ledger" loading={loading} />
        <AdminStat label="Today" value={kpis.today} icon={<CalendarClock size={15} strokeWidth={2} />} sub="events since midnight" loading={loading} />
        <AdminStat label="Distinct Actors" value={kpis.actors} icon={<Users size={15} strokeWidth={2} />} sub="users / system" loading={loading} />
        <AdminStat label="Entities Touched" value={kpis.entities} icon={<Activity size={15} strokeWidth={2} />} sub="tickets affected" loading={loading} />
      </AdminGrid>

      <AdminCard title="Activity Ledger" desc="Most recent first · sortable." pad={false}>
        <AdminDataTable
          rows={logs} columns={columns} pageSize={12} loading={loading}
          getRowKey={(r, i) => `${r.id}-${i}`}
          initialSort={{ key: 'ts', dir: 'desc' }}
          empty={<AdminEmpty icon={<ShieldCheck size={18} />} title="No audit logs yet"
            sub="System activities, routing transitions, and authorization resets are recorded here as they happen." />}
        />
      </AdminCard>
    </div>
  );
}
