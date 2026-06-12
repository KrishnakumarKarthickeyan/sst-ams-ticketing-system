'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { ShieldCheck, Calendar, Activity, Loader2 } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { tickets, loading } = useTickets();

  // Extract all history events from all tickets to build system audit logs
  const logs = React.useMemo(() => {
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
            : `Ticket activity logged.`
        }))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-ink-secondary">
        <Loader2 className="animate-spin mr-2" size={16} />
        LOADING SYSTEM AUDIT LEDGER...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-ink">
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">System Audit Logs</h1>
        <p className="type-meta mt-1 text-ink-secondary">Immutable security ledger of all platform administrative adjustments, user logins, and database mutations.</p>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-8 text-center space-y-3">
          <Activity className="mx-auto text-ink-muted" size={32} />
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">No audit logs recorded yet</h3>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">System activities, ticket routing transitions, and authorization resets will be recorded in this secure log ledger.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-secondary">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted/60">
                  <td className="p-4 text-ink-muted flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={12} />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-ink">{log.actor}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle text-ink font-semibold border border-line">
                      <Activity size={10} />
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-ink-secondary truncate max-w-[180px]">{log.target}</td>
                  <td className="p-4 text-right text-[11px] text-ink-secondary">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
