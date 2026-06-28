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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-success-soft border border-success-border text-success-strong text-[11px] font-bold">
          <Check size={11} className="text-success" />
          {timeLeftStr}
        </span>
      );
    case 'BREACHED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-critical-soft border border-critical-border text-critical-strong text-[11px] font-bold animate-pulse">
          <ShieldX size={11} className="text-critical" />
          {timeLeftStr}
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-warning-soft border border-warning-border text-warning-strong text-[11px] font-bold">
          <ShieldAlert size={11} className="text-warning" />
          {timeLeftStr}
        </span>
      );
    case 'COMPLIANT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-line text-ink text-[11px] font-bold">
          <ShieldCheck size={11} className="text-ink-secondary" />
          {timeLeftStr}
        </span>
      );
  }
};
