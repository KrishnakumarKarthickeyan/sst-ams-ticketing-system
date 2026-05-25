'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { User, Activity, AlertTriangle, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function ManagerConsultantsPage() {
  const { tickets } = useTickets();

  // Consultant staff definition
  const consultants = [
    { name: 'Karthik Subramanian', role: 'Senior SAP Functional Lead (MM/SD)', email: 'consultant@sap.com' },
    { name: 'Elena Rostova', role: 'SAP BASIS Administrator', email: 'elena@sap.com' },
    { name: 'Rajesh Kumar', role: 'Lead ABAP Developer', email: 'rajesh@sap.com' }
  ];

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Consultants Workload Dashboard</h1>
        <p className="text-zinc-500 mt-1">Monitor active queue counts, review logged effort hours, and verify resource assignments.</p>
      </div>

      {/* Grid of Consultants */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {consultants.map((c) => {
          const activeTickets = tickets.filter(t => t.assignedConsultant === c.name && t.status !== 'Resolved' && t.status !== 'Closed');
          const resolvedCount = tickets.filter(t => t.assignedConsultant === c.name && (t.status === 'Resolved' || t.status === 'Closed')).length;
          const totalHours = tickets.reduce((acc, t) => {
            if (t.assignedConsultant === c.name) {
              const logs = t.efforts.filter(e => e.consultantName === c.name);
              return acc + logs.reduce((sum, l) => sum + l.hoursLogged, 0);
            }
            return acc;
          }, 0);

          return (
            <div key={c.name} className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-zinc-950 transition">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-150 flex items-center justify-center font-bold text-zinc-900 text-sm">
                    {c.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-950">{c.name}</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{c.role}</p>
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2 border-t border-b border-zinc-100 py-3 text-center">
                <div>
                  <span className="text-lg font-black text-zinc-950 font-mono block">{activeTickets.length}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">Active</span>
                </div>
                <div>
                  <span className="text-lg font-black text-zinc-800 font-mono block">{resolvedCount}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">Resolved</span>
                </div>
                <div>
                  <span className="text-lg font-black text-zinc-800 font-mono block">{totalHours.toFixed(1)}h</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">Effort</span>
                </div>
              </div>

              {/* Active tickets listed briefly */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Assigned Open Incidents</span>
                {activeTickets.length === 0 ? (
                  <p className="text-zinc-400 text-[10px] italic">No active incidents.</p>
                ) : (
                  <div className="space-y-1">
                    {activeTickets.map(t => (
                      <Link
                        key={t.id}
                        href={`/tickets/${t.id}`}
                        className="flex justify-between items-center bg-zinc-50 border border-zinc-200 rounded p-1.5 hover:border-zinc-950 transition text-[10px]"
                      >
                        <span className="font-bold text-zinc-800">{t.id}</span>
                        <span className="text-zinc-500 font-mono font-bold uppercase">{t.priority}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
