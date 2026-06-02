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
      <div className="flex h-[50vh] items-center justify-center font-mono text-zinc-500">
        <Loader2 className="animate-spin mr-2" size={16} />
        LOADING SYSTEM AUDIT LEDGER...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">System Audit Logs</h1>
        <p className="text-zinc-500 mt-1">Immutable security ledger of all platform administrative adjustments, user logins, and database mutations.</p>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center space-y-3">
          <Activity className="mx-auto text-zinc-400" size={32} />
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No audit logs recorded yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">System activities, ticket routing transitions, and authorization resets will be recorded in this secure log ledger.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50">
                  <td className="p-4 text-zinc-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={12} />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-zinc-800">{log.actor}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-850 font-semibold border border-zinc-250">
                      <Activity size={10} />
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-zinc-600 truncate max-w-[180px]">{log.target}</td>
                  <td className="p-4 text-right font-mono text-[11px] text-zinc-500">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
