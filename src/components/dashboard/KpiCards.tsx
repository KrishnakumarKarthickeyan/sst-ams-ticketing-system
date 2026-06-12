import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface DashboardStats {
  executive: {
    totalTicketsRaised: number;
    openTickets: number;
    unassignedTickets: number;
    criticalTickets: number;
    slaBreachedTickets: number;
    raisedToSap: number;
    reqClosure: number;
    reopenedTickets: number;
    customerAction: number;
  };
  delivery: {
    ticketsReqManagerAction: number;
    ticketsAwaitingApproval: number; // not currently in stats, placeholder
    ticketsPendingClosureDecision: number;
    ticketsPendingRating: number;
    ticketsWaitingCustomer: number;
  };
}

interface KpiCardsProps {
  stats: DashboardStats;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats }) => {
  const {
    totalTicketsRaised,
    openTickets,
    unassignedTickets,
    criticalTickets,
    slaBreachedTickets,
    raisedToSap,
    reqClosure,
    reopenedTickets,
    customerAction,
  } = stats.executive;

  const cards = [
    { label: 'Total Raised', value: totalTicketsRaised, color: 'bg-surface-subtle text-ink' },
    { label: 'Open Tickets', value: openTickets, color: 'bg-blue-100 text-blue-800' },
    { label: 'Unassigned', value: unassignedTickets, color: 'bg-amber-100 text-amber-800' },
    { label: 'Critical', value: criticalTickets, color: 'bg-red-100 text-red-800' },
    { label: 'SLA Breached', value: slaBreachedTickets, color: 'bg-red-100 text-red-800' },
    { label: 'Raised to SAP', value: raisedToSap, color: 'bg-gray-100 text-gray-800' },
    { label: 'Awaiting Closure', value: reqClosure, color: 'bg-blue-100 text-blue-800' },
    { label: 'Reopened', value: reopenedTickets, color: 'bg-red-100 text-red-800' },
    { label: 'Customer Action', value: customerAction, color: 'bg-gray-100 text-gray-800' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {cards.map((c) => (
        <Card key={c.label} className="border border-line shadow-card">
          <CardHeader className="p-3 bg-surface-muted border-b border-line">
            <CardTitle className="text-xs font-medium uppercase text-ink-secondary">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex items-center justify-center">
            <Badge className={`text-sm font-bold ${c.color}`}>{c.value}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
