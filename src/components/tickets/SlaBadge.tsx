'use client';

import React, { useEffect, useState } from 'react';
import { Ticket } from '../../types/ticket';
import { ShieldCheck, ShieldAlert, ShieldX, Check } from 'lucide-react';

interface SlaBadgeProps {
  ticket: Ticket;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({ ticket }) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [slaStatus, setSlaStatus] = useState<'MET' | 'BREACHED' | 'WARNING' | 'COMPLIANT'>('COMPLIANT');

  useEffect(() => {
    const calculateSLA = () => {
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        setSlaStatus('MET');
        setTimeLeftStr('SLA Met');
        return;
      }

      const due = new Date(ticket.slaDueAt).getTime();
      const now = new Date().getTime();
      const diffMs = due - now;

      if (diffMs <= 0) {
        setSlaStatus('BREACHED');
        setTimeLeftStr('SLA Breached');
      } else {
        const diffHrs = diffMs / (1000 * 60 * 60);
        const hrs = Math.floor(diffHrs);
        const mins = Math.floor((diffHrs - hrs) * 60);

        if (diffHrs < 2) {
          setSlaStatus('WARNING');
          setTimeLeftStr(`${hrs}h ${mins}m left`);
        } else {
          setSlaStatus('COMPLIANT');
          setTimeLeftStr(`${hrs}h left`);
        }
      }
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [ticket.slaDueAt, ticket.status]);

  switch (slaStatus) {
    case 'MET':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold font-mono">
          <Check size={11} className="text-emerald-600" />
          {timeLeftStr}
        </span>
      );
    case 'BREACHED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold font-mono animate-pulse">
          <ShieldX size={11} className="text-red-600" />
          {timeLeftStr}
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold font-mono">
          <ShieldAlert size={11} className="text-amber-600" />
          {timeLeftStr}
        </span>
      );
    case 'COMPLIANT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-bold font-mono">
          <ShieldCheck size={11} className="text-zinc-500" />
          {timeLeftStr}
        </span>
      );
  }
};
